#!/usr/bin/env node
// probe-05 — M5 POC: mid-run revision (PRD §6 M5).
// Riskiest assumption: on a STALLED close, an agent-authored revision of the
// CONFIG (not the code) recovers the run where no-revision doesn't.
// Exit: recovery rate > no-revision control on stall-prone tasks.
//
// Design honesty:
// - Stall-proneness is EMPIRICAL, not asserted: the dur.mjs info-gap task with a
//   blind config (slots empty, store seeded but unused) stalled to cap in 4/4
//   prior live runs (F7). A live control arm re-measures it in-probe; if the
//   control mostly greens the probe declares itself INVALID (task not
//   stall-prone at this cap) instead of comparing non-stalled arms.
// - The revisor may touch ONLY the free axes. gate and escalation are the
//   arbiter's edge: a revision that changes either is rejected (arbiter-touch
//   revision-red) and the run continues on the OLD config. Machinery-tested
//   token-free below, before any live spend.
// - An invalid revision (garbage / validation red) degrades loudly
//   (revision-red on the spine) and the run continues stalled — never a crash,
//   never a silent accept, never a retry.
// - Falsifier arm: revision with an EMPTY store. If revision "recovers" without
//   the resource its edit reaches for, the mechanism story is wrong — reported
//   either way.
// - Fit-to-pass: revisor sees the stall evidence (gap text) — the same text the
//   worker already receives; the close stays GOLD and unseen. Sealed workers (F8).
//
// Throwaway per house rules. Live tokens via local claude (clipipe), subscription.

import { createRequire } from 'node:module';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { Gate } from 'bareguard';
import { LiteCtx, compress } from 'litectx';
import { makeSpine } from '../src/spine.js';
import { ralph } from '../src/ralph.js';
import { validateConfig, diffPaths } from '../src/validate.js';
import { renderCatalog } from '../src/author.js';

const require = createRequire(import.meta.url);
const { Loop, wireGate, HaltError } = require('bare-agent');
const { CLIPipeProvider } = require('bare-agent/providers');

const PERSONA = 'You are a senior engineer. Reply with ONLY the complete contents of the requested JavaScript file — no markdown fences, no commentary. ESM.';
const stripFences = (t) => t.trim().replace(/^```[a-z]*\n?/i, '').replace(/\n?```\s*$/, '');
const STALL_REDS = 2; // consecutive close reds that count as a stall
const CAP_RUNS = 4;   // matches the F7 evidence base (4/4 stalls at this cap)

// ---- the revisor: one shot, free axes only, loud rejection ----
async function reviseConfig({ config, gaps, provider, shellCapUsd = 2 }) {
  const loop = new Loop({ provider, system: 'You emit exactly one JSON document and nothing else.' });
  const prompt = `${renderCatalog({ shellCapUsd })}

Your harness is MID-RUN and STALLED: ${gaps.length} consecutive attempts failed the hidden
test suite. Its current config:

${JSON.stringify(config, null, 2)}

Most recent failure output:
${gaps.at(-1).slice(0, 1500)}

Revise the config so the remaining iterations can recover. You may change "loop", "memory",
and "hooks" only. "gate" and "escalation" are FIXED — copy them into your output unchanged.
Output ONLY the full revised JSON config.`;
  const r = await loop.run([{ role: 'user', content: prompt }]);
  const costUsd = r.cost ?? 0;
  let revised = null;
  try { revised = JSON.parse(stripFences(r.text ?? '')); } catch (e) {
    return { accepted: false, red: { code: 'parse-error', detail: String(e.message) }, costUsd };
  }
  const v = validateConfig(revised, { shellCapUsd });
  if (!v.ok) return { accepted: false, red: { code: 'validation', reds: v.reds }, costUsd };
  if (JSON.stringify(revised.gate) !== JSON.stringify(config.gate)
      || JSON.stringify(revised.escalation) !== JSON.stringify(config.escalation)) {
    return { accepted: false, red: { code: 'arbiter-touch', detail: 'revision changed gate/escalation — rejected, arbiter is not the agent\'s to author' }, costUsd };
  }
  return { accepted: true, config: revised, changedPaths: diffPaths(config, revised), costUsd };
}

// ---- POC-cut revisable interpreter (interpret.js middle + stall/revise; graduates by rewrite) ----
async function interpretRevisable(initialConfig, { task, target, close, workdir, emit, worker, revisor, revise }) {
  assert.ok(validateConfig(initialConfig).ok, 'initial config must be legal');
  let config = initialConfig;
  const lc = new LiteCtx({ root: workdir });
  const gate = new Gate({
    fs: { writeScope: config.gate.writeScope.map((g) => join(workdir, g.replace(/\/\*\*?$/, ''))) },
    budget: { maxCostUsd: config.gate.budgetUsd },
    limits: { maxTurns: 8 * (CAP_RUNS + 2) },
    audit: { path: join(workdir, 'gate-audit.jsonl') },
    humanChannel: async () => ({ decision: 'terminate' }),
  });
  await gate.init();
  const { policy, onLlmResult } = wireGate(gate);
  const loop = new Loop({ provider: worker, system: PERSONA, policy, onLlmResult });

  const ask = async (prompt) => {
    try { return await loop.run([{ role: 'user', content: prompt }]); }
    catch (e) { if (e instanceof HaltError) e.category = 'cap-halt'; throw e; }
  };
  const slotOps = (slot) => config.hooks?.[slot] ?? [];
  const runOps = async (slot, { iteration, gap, context }) => {
    for (const op of slotOps(slot)) {
      if (op.op === 'recall') {
        const hits = [];
        for (const kind of op.kinds ?? config.memory.recall?.kinds ?? ['fact']) {
          hits.push(...await lc.recall(task, { kind, n: op.k ?? config.memory.recall?.k ?? 5, body: true }));
        }
        context.text = hits.map((h) => h.body ?? h.text ?? '').filter(Boolean).join('\n');
        emit('hook-op', { slot, op: 'recall', hits: hits.length, iteration });
      } else if (op.op === 'compress') {
        const level = op.level ?? config.memory.compressLevel ?? 'verbatim';
        if (context.text) context.text = await compress({ text: context.text, format: 'js' }, { level });
        emit('hook-op', { slot, op: 'compress', level, iteration });
      } else if (op.op === 'stash') {
        if (gap) lc.stash(`gap-${iteration}`, gap);
        emit('hook-op', { slot, op: 'stash', iteration });
      } else if (op.op === 'remember') {
        await lc.remember(`green-${iteration ?? 'final'}`, readFileSync(target, 'utf8'), { kind: op.kind ?? 'fact' });
        emit('hook-op', { slot, op: 'remember' });
      }
    }
  };

  const gaps = [];
  let revisionSpent = 0;
  let revisionsUsed = 0;
  const middle = async (iteration, gap) => {
    if (gap) gaps.push(gap); else gaps.length = 0; // consecutive reds only
    if (revise && revisionsUsed === 0 && gaps.length >= STALL_REDS) {
      emit('stall-detected', { iteration, consecutiveReds: gaps.length });
      revisionsUsed += 1;
      const rv = await revisor({ config, gaps });
      revisionSpent += rv.costUsd;
      if (rv.accepted) {
        config = rv.config;
        emit('revision-accepted', { iteration, changedPaths: rv.changedPaths, costUsd: rv.costUsd });
      } else {
        emit('revision-red', { iteration, ...rv.red, costUsd: rv.costUsd });
      }
    }
    if (gap) await runOps('after-red', { iteration, gap, context: {} });
    const context = {};
    await runOps('before-attempt', { iteration, context });
    const parts = [task, context.text && `Possibly relevant notes:\n${context.text}`, gap && `Previous attempt failed the test suite:\n${gap}`];
    if (config.loop.shape === 'plan') {
      const p = await ask([`Produce a SHORT numbered implementation plan (2-4 steps) for this task. Plan only, no code.`, ...parts.slice(1), parts[0]].filter(Boolean).join('\n\n'));
      emit('worker-plan', { iteration, costUsd: p.cost ?? null });
      parts.push(`Follow this plan:\n${p.text}`);
    }
    const r = await ask(parts.filter(Boolean).join('\n\n'));
    emit('worker-result', { iteration, costUsd: r.cost ?? null });
    const decision = await gate.check({ type: 'write', path: target, args: { bytes: r.text.length } });
    if (decision.outcome !== 'allow') {
      const err = new Error(`gate ${decision.outcome} write to ${target}`);
      err.category = decision.severity === 'halt' ? 'cap-halt' : 'gate-red';
      throw err;
    }
    writeFileSync(target, stripFences(r.text));
    emit('artifact-written', { iteration });
  };

  const effectiveCap = Math.min(CAP_RUNS, config.loop.maxIterations ?? CAP_RUNS);
  const outcome = await ralph({ middle, close, capRuns: effectiveCap, emit });
  if (outcome === 'green') { try { await runOps('on-green', {}); } catch (e) { emit('retention-red', { detail: String(e.message || e) }); } }
  return { outcome, config, revisionSpent };
}

// ---- fixtures ----
const BLIND = {
  schema: 'v1',
  loop: { shape: 'refine', maxIterations: 8 },
  memory: { store: 'litectx', recall: { k: 5, kinds: ['fact'] }, compressLevel: 'signature' },
  hooks: {}, // blind: the store may hold notes; nothing surfaces them
  gate: { budgetUsd: 2, writeScope: ['src/**'] },
  escalation: { mode: 'decision-ready' },
};
const TASK = 'Implement the file dur.mjs. It must export a named function `parseDuration(str)` that parses a duration string (like "1h30m" or "500ms") and returns the total number of milliseconds.';
const SUITE = readFileSync(new URL('./probe-03-contrast.mjs', import.meta.url), 'utf8').match(/const SUITE = `([\s\S]*?)`;/)[1];
const SEEDS = [
  ['note-duration-format', 'Duration format house spec: valid units are h, m, s, and ms; components may be separated by single spaces (e.g. "2h 15m"); unit letters are case-insensitive, so "1H30M" equals "1h30m". Fractional values like "1.5h" are allowed.'],
  ['note-duration-edges', 'Duration parsing edge rules: a bare numeric string with no unit (e.g. "250") means milliseconds; negative durations are invalid and must throw a RangeError; empty strings and non-string input must throw a TypeError.'],
  ['note-decoy-spine', 'The event spine is append-only JSONL: type first, seq monotonic per spine, ts stamped last as the final key; consumers are pure listeners and never read the file back.'],
];

const work = mkdtempSync(join(tmpdir(), 'probe05-'));
const CLI_HOME = join(work, 'cli-home');
mkdirSync(CLI_HOME, { recursive: true });
console.log(`world: ${work}\n`);

const sealed = () => new CLIPipeProvider({
  command: 'claude',
  args: ['-p', '--output-format', 'json', '--disallowedTools', 'Write,Edit,NotebookEdit,Bash,WebFetch,WebSearch,Task,Glob,Grep,Read,TodoWrite'],
  parse: 'claude-json', cwd: CLI_HOME, timeout: 180_000,
});
const stub = (text) => ({ generate: async () => ({ text, usage: { inputTokens: 1, outputTokens: 1 }, costUsd: 0.01, toolCalls: [] }) });

async function runOne(name, { seedStore, revise, worker, revisorProvider }) {
  const workdir = join(work, name);
  mkdirSync(join(workdir, 'src'), { recursive: true });
  const target = join(workdir, 'src', 'dur.mjs');
  const suite = join(workdir, 'src', 'dur.test.mjs');
  writeFileSync(suite, SUITE);
  if (seedStore) {
    const lc = new LiteCtx({ root: workdir });
    for (const [id, text] of SEEDS) await lc.remember(id, text, { kind: 'fact' });
  }
  const spineFile = join(work, `spine-${name}.jsonl`);
  const revisorCalls = [];
  const revisor = async ({ config, gaps }) => {
    const rv = await reviseConfig({ config, gaps, provider: revisorProvider ?? sealed() });
    revisorCalls.push(rv);
    if (rv.accepted) writeFileSync(join(work, `revised-${name}.json`), JSON.stringify(rv.config, null, 2));
    return rv;
  };
  const res = await interpretRevisable(BLIND, {
    task: TASK, target, close: ['node', '--test', suite], workdir,
    emit: makeSpine(spineFile), worker: worker ?? sealed(), revisor, revise,
  });
  const events = readFileSync(spineFile, 'utf8').trimEnd().split('\n').map((l) => JSON.parse(l));
  const end = events.find((e) => e.type === 'run-end');
  const cost = events.filter((e) => e.type === 'worker-result' || e.type === 'worker-plan').reduce((s, e) => s + (e.costUsd ?? 0), 0) + res.revisionSpent;
  const out = { name, outcome: res.outcome, iterations: end?.iterations, costUsd: +cost.toFixed(4), events, revisorCalls };
  console.log(`[${name}] → ${res.outcome} @ ${out.iterations} ($${out.costUsd})${revisorCalls.length ? ` | revision: ${revisorCalls[0].accepted ? `accepted ${JSON.stringify(revisorCalls[0].changedPaths)}` : `RED ${revisorCalls[0].red.code}`}` : ''}`);
  return out;
}

// ---- stage 1: token-free machinery negatives (stub providers, each can fail) ----
console.log('— machinery negatives (token-free) —');
const badWorker = stub('this is not javascript at all;;;');
// S1: revision touches the gate → arbiter-touch red, run continues on OLD config to cap-halt
const greedy = JSON.parse(JSON.stringify(BLIND)); greedy.gate.budgetUsd = 0.01;
const s1 = await runOne('S1-arbiter-touch', { seedStore: false, revise: true, worker: badWorker, revisorProvider: stub(JSON.stringify(greedy)) });
assert.equal(s1.events.filter((e) => e.type === 'revision-red' && e.code === 'arbiter-touch').length, 1, 'S1: arbiter-touch must red exactly once');
assert.ok(!s1.events.some((e) => e.type === 'revision-accepted'), 'S1: nothing accepted');
assert.equal(s1.outcome, 'escalated', 'S1: run continued on old config to the cap');
// S2: garbage revision → parse-error red, run continues, never a crash
const s2 = await runOne('S2-garbage-revision', { seedStore: false, revise: true, worker: badWorker, revisorProvider: stub('I suggest we try harder!') });
assert.equal(s2.events.filter((e) => e.type === 'revision-red' && e.code === 'parse-error').length, 1, 'S2: parse-error red exactly once');
assert.equal(s2.outcome, 'escalated', 'S2: degraded loudly, continued to cap');
// S3: no stall → the revisor is never consulted
const goodWorker = stub('export function parseDuration(s){if(typeof s!=="string"||s==="")throw new TypeError("bad");const t=s.toLowerCase();if(/^\\d+(\\.\\d+)?$/.test(t))return Number(t);if(t.includes("-"))throw new RangeError("neg");let m,total=0,re=/(\\d+(?:\\.\\d+)?)(ms|s|m|h)/g,units={ms:1,s:1e3,m:6e4,h:36e5};while((m=re.exec(t.replace(/\\s+/g,"")))!==null)total+=Number(m[1])*units[m[2]];if(t.trim().startsWith("-"))throw new RangeError("neg");return total}');
const s3 = await runOne('S3-no-stall', { seedStore: false, revise: true, worker: goodWorker, revisorProvider: stub('SHOULD NEVER BE CALLED') });
assert.equal(s3.outcome, 'green', 'S3: stub worker must green (fix the stub if not)');
assert.equal(s3.revisorCalls.length, 0, 'S3: revisor must never fire without a stall');
assert.ok(!s3.events.some((e) => e.type === 'stall-detected'), 'S3: no stall event');
console.log('machinery negatives PASS\n');

// ---- stage 2: live arms ----
console.log('— live arms —');
const revision = [];
for (let i = 1; i <= 3; i++) revision.push(await runOne(`revision-${i}`, { seedStore: true, revise: true }));
const control = [];
for (let i = 1; i <= 3; i++) control.push(await runOne(`control-${i}`, { seedStore: true, revise: false }));
const emptyStore = [];
for (let i = 1; i <= 2; i++) emptyStore.push(await runOne(`empty-store-${i}`, { seedStore: false, revise: true }));

// validity guard: the task must actually be stall-prone at this cap (F7 base: 4/4 stalls)
const controlGreens = control.filter((r) => r.outcome === 'green').length;
assert.ok(controlGreens <= 1, `probe INVALID: control greened ${controlGreens}/3 — task not stall-prone at cap ${CAP_RUNS}; redesign, don't compare non-stalled arms`);

// ---- the measurement (reported either way) ----
const rate = (rs) => `${rs.filter((r) => r.outcome === 'green').length}/${rs.length}`;
console.log('\n—— M5 readout ——');
console.log(`recovery: revision ${rate(revision)} vs control ${rate(control)} (exit needs revision > control)`);
console.log(`falsifier (empty store): ${rate(emptyStore)} — if this matches the seeded revision arm, recovery is not the mechanism claimed`);
for (const r of [...revision, ...control, ...emptyStore]) {
  const rev = r.revisorCalls[0];
  console.log(`  ${r.name}: ${r.outcome}@${r.iterations} $${r.costUsd}${rev ? ` | ${rev.accepted ? `revised ${JSON.stringify(rev.changedPaths)}` : `revision-red ${rev.red.code}`}` : ''}`);
}
console.log(`evidence: ${work}`);
