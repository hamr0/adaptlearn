#!/usr/bin/env node
// probe-menu-disclosure — bareloop de-risk POC #2 (F21's registered B-arm +
// author-side selection + the ask channel), run in the adaptlearn sandbox.
// NOT an adaptlearn result. Pre-registration: poc/menu-disclosure-prereg.md.
//
// One axis — how `impact` is disclosed to the AUTHOR:
//   D0 absent (stock catalog) | D1 admitted (selected -> dispatched) | D2 locked
//   (selected -> request-red, skipped, run continues)
// Cells: authoring {D0,D1,D2} x {main,leaf} x REPS; runs MAIN-only, each rep's
// own authored config.
//
// Honesty:
// - author sees task + catalog ONLY (M4 seal); one shot, authored-invalid is a
//   result, never a re-ask. The impact catalog line is neutral (no strategy).
// - schema v1 stays closed: stock validateConfig judges configs AFTER impact ops
//   are stripped-and-counted (POC-local acceptance; the count IS the datum).
// - instrument improvement over F21, applied to ALL conditions: extraction takes
//   the last fenced block when fences appear mid-prose (the F21 crack).
// - all five machinery-negative groups measured token-free before any spend.
// Wall-clock: 18 author calls + 9 runs x <=4 iterations — expect ~30-60min.
// Throwaway per house rules. Live tokens via local claude (clipipe), subscription.

import { createRequire } from 'node:module';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { LiteCtx, compress } from 'litectx';
import { makeSpine } from '../src/spine.js';
import { ralph, runClose } from '../src/ralph.js';
import { validateConfig } from '../src/validate.js';
import { renderCatalog } from '../src/author.js';

const require = createRequire(import.meta.url);
const { Loop } = require('bare-agent');
const { CLIPipeProvider } = require('bare-agent/providers');

const REPS = Number(process.env.REPS ?? 3);
const CAP = 4;
const PERSONA = 'You are a senior engineer. Reply with ONLY the complete contents of the requested JavaScript file — no markdown fences, no commentary. ESM.';

const work = mkdtempSync(join(tmpdir(), 'probe-disclose-'));
const CLI_HOME = join(work, 'cli-home');
mkdirSync(CLI_HOME, { recursive: true });
console.log(`world: ${work}\n`);

const sealedProvider = () => new CLIPipeProvider({
  command: 'claude',
  args: ['-p', '--output-format', 'json', '--disallowedTools', 'Write,Edit,NotebookEdit,Bash,WebFetch,WebSearch,Task,Glob,Grep,Read,TodoWrite'],
  parse: 'claude-json', cwd: CLI_HOME, timeout: 180_000,
});

// Provider-seam resilience (instrument, not verdict-gaming): the hhD2yp world
// lost all 3 D2 runs to CLI exit-1 crashes ~40 calls in (rate-limit shaped).
// One retry after a backoff; a second failure rethrows tagged provider-red so
// the cell is EXCLUDED from reads (§5b: a broken middle is never a verdict).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function askLoop(loop, content) {
  try {
    return await loop.run([{ role: 'user', content }]);
  } catch (e) {
    console.log(`  [provider retry in 30s] ${String(e.message || e).slice(0, 120)}`);
    await sleep(30_000);
    try {
      return await loop.run([{ role: 'user', content }]);
    } catch (e2) {
      e2.category = 'provider-red';
      throw e2;
    }
  }
}

// ---- instrument improvement over F21 (registered): mid-prose fences ----
// If the reply contains fenced blocks anywhere, take the LAST one (the F21
// prose-spiral wrote reasoning + a fenced file; leading-only stripping let the
// prose through). No fences -> the raw trimmed text, as before.
export function extractArtifact(text) {
  const t = (text ?? '').trim();
  const blocks = [...t.matchAll(/```[a-z]*\n([\s\S]*?)```/gi)].map((m) => m[1]);
  if (blocks.length) return blocks.at(-1).trim();
  return t.replace(/^```[a-z]*\n?/i, '').replace(/\n?```\s*$/, '');
}

// ---- world template: F21 verbatim (probe-menu-breadth.mjs is frozen evidence) ----
const STUB_FORMAT = `// format.mjs — shared label formatter
export function formatLabel(item = {}) {
  return String(item.name ?? '');
}
`;
const STUB_LEAF = `// leaf.mjs — standalone marker-string parser
export function parseThing(str) {
  const [level, count] = String(str).split('!');
  return { level, count: Number(count) };
}
`;
const CALLERS = {
  'badge.mjs': ["house rule: tags render comma-joined in square brackets after the name: formatLabel({ name: 'Cache', tags: ['fast', 'io'] }) === 'Cache [fast,io]'", 'export const tagBadge = (name, tags) => formatLabel({ name, tags });'],
  'price.mjs': ["house rule: integer cents render after an em dash as dollars with two decimals: formatLabel({ name: 'Widget', cents: 150 }) === 'Widget — $1.50'", 'export const priceLine = (name, cents) => formatLabel({ name, cents });'],
  'qty.mjs': ["house rule: a quantity renders as a multiplication-sign suffix: formatLabel({ name: 'Bolt', qty: 3 }) === 'Bolt ×3'", 'export const qtyLine = (name, qty) => formatLabel({ name, qty });'],
  'legacy.mjs': ["house rule: a deprecated item is wrapped in double tildes: formatLabel({ name: 'OldApi', deprecated: true }) === '~~OldApi~~'", 'export const legacyLine = (name) => formatLabel({ name, deprecated: true });'],
  'shout.mjs': ["house rule: opts.upper uppercases the whole label: formatLabel({ name: 'Alert' }, { upper: true }) === 'ALERT'", 'export const shoutLine = (name) => formatLabel({ name }, { upper: true });'],
  'narrow.mjs': ["house rule: opts.max truncates to max chars INCLUDING a trailing '…': formatLabel({ name: 'Extraordinarily' }, { max: 8 }) === 'Extraor…'", 'export const narrowLine = (name, max) => formatLabel({ name }, { max });'],
  'keyed.mjs': ["house rule: an id renders as a hash suffix: formatLabel({ name: 'Node', id: 42 }) === 'Node#42'", 'export const keyedLine = (name, id) => formatLabel({ name, id });'],
  'anon.mjs': ["house rule: a missing name renders as the placeholder '(unnamed)': formatLabel({}) === '(unnamed)'", 'export const anonLine = () => formatLabel({});'],
};
const SUITE_MAIN = `
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tagBadge } from '../world/callers/badge.mjs';
import { priceLine } from '../world/callers/price.mjs';
import { qtyLine } from '../world/callers/qty.mjs';
import { legacyLine } from '../world/callers/legacy.mjs';
import { shoutLine } from '../world/callers/shout.mjs';
import { narrowLine } from '../world/callers/narrow.mjs';
import { keyedLine } from '../world/callers/keyed.mjs';
import { anonLine } from '../world/callers/anon.mjs';
test('badge: tags comma-joined in brackets', () => assert.equal(tagBadge('Cache', ['fast', 'io']), 'Cache [fast,io]'));
test('price: em-dash dollars from cents', () => assert.equal(priceLine('Widget', 150), 'Widget — $1.50'));
test('qty: multiplication-sign suffix', () => assert.equal(qtyLine('Bolt', 3), 'Bolt ×3'));
test('legacy: deprecated wraps in tildes', () => assert.equal(legacyLine('OldApi'), '~~OldApi~~'));
test('shout: upper option uppercases', () => assert.equal(shoutLine('Alert'), 'ALERT'));
test('narrow: max truncates with ellipsis', () => assert.equal(narrowLine('Extraordinarily', 8), 'Extraor…'));
test('keyed: id hash suffix', () => assert.equal(keyedLine('Node', 42), 'Node#42'));
test('anon: missing name placeholder', () => assert.equal(anonLine(), '(unnamed)'));
`;
const REF_FORMAT = `
export function formatLabel(item = {}, opts = {}) {
  let label = item.name ?? '(unnamed)';
  if (item.id !== undefined) label += '#' + item.id;
  if (item.qty !== undefined) label += ' ×' + item.qty;
  if (item.cents !== undefined) label += ' — $' + (item.cents / 100).toFixed(2);
  if (item.tags?.length) label += ' [' + item.tags.join(',') + ']';
  if (item.deprecated) label = '~~' + label + '~~';
  if (opts.upper) label = label.toUpperCase();
  if (opts.max !== undefined && label.length > opts.max) label = label.slice(0, opts.max - 1) + '…';
  return label;
}
`;
const NOTES = [
  ['note-thing-format', 'parseThing house spec: a marker string is a level word, optionally followed by "!" and a count — parseThing("urgent!3") returns { level: "urgent", count: 3 }. The level word is always lowercased in the result; a missing "!count" suffix defaults count to 1.', 'episode'],
  ['note-thing-edges', 'parseThing edge rules: a zero or negative count must throw a RangeError; an empty level must throw a RangeError; non-string input must throw a TypeError.', 'episode'],
  ['note-decoy-spine', 'The event spine is append-only JSONL: type first, seq monotonic per spine, ts stamped last as the final key; consumers are pure listeners and never read the file back.', 'episode'],
  ['note-decoy-git', 'Repo hygiene: never git add -A; stage explicit paths only, and session directories stay untracked. Only .env.example is ever committed, real env comes in at runtime.', 'episode'],
];
const TASKS = {
  main: {
    symbol: 'formatLabel', targetRel: 'format.mjs', suite: 'format.test.mjs',
    task: 'Fix the file format.mjs in this repo. Its exported function `formatLabel(item, opts)` is a shared formatter that other modules call, and the shared test suite is failing. Rewrite format.mjs (keep the named export `formatLabel`) so that every caller\'s expectation holds. Emit the complete new contents of format.mjs.',
  },
  leaf: {
    symbol: 'parseThing', targetRel: 'leaf.mjs', suite: 'leaf.test.mjs',
    task: 'Fix the file leaf.mjs in this repo. Its exported function `parseThing(str)` does not follow the house parsing conventions, and the test suite is failing. Rewrite leaf.mjs (keep the named export `parseThing`) so it conforms. Emit the complete new contents of leaf.mjs.',
  },
};

function writeWorld(dir) {
  mkdirSync(join(dir, 'world', 'callers'), { recursive: true });
  mkdirSync(join(dir, 'closes'), { recursive: true });
  writeFileSync(join(dir, 'world', 'format.mjs'), STUB_FORMAT);
  writeFileSync(join(dir, 'world', 'leaf.mjs'), STUB_LEAF);
  for (const [f, [rule, wrapper]] of Object.entries(CALLERS)) {
    writeFileSync(join(dir, 'world', 'callers', f), `// ${rule}\nimport { formatLabel } from '../format.mjs';\n${wrapper}\n`);
  }
  writeFileSync(join(dir, 'closes', 'format.test.mjs'), SUITE_MAIN);
  const leafSuite = `
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseThing } from '../world/leaf.mjs';
test('basic level!count', () => assert.deepEqual(parseThing('urgent!3'), { level: 'urgent', count: 3 }));
test('level is lowercased', () => assert.deepEqual(parseThing('URGENT!2'), { level: 'urgent', count: 2 }));
test('missing count defaults to 1', () => assert.deepEqual(parseThing('meh'), { level: 'meh', count: 1 }));
test('zero or negative count throws RangeError', () => {
  assert.throws(() => parseThing('x!0'), RangeError);
  assert.throws(() => parseThing('x!-2'), RangeError);
});
test('empty level throws RangeError', () => assert.throws(() => parseThing(''), RangeError));
test('non-string throws TypeError', () => assert.throws(() => parseThing(7), TypeError));
`;
  writeFileSync(join(dir, 'closes', 'leaf.test.mjs'), leafSuite);
  // real git repo with seed files committed — a bare `git init` silently blinds
  // litectx collectFiles (F21 / UPSTREAM-ASKS A3). Explicit paths, never -A.
  const world = join(dir, 'world');
  const g = (...args) => spawnSync('git', ['-C', world, ...args], { encoding: 'utf8' });
  g('init', '-q');
  g('add', 'format.mjs', 'leaf.mjs', 'callers');
  g('-c', 'user.email=probe@local', '-c', 'user.name=probe', 'commit', '-q', '-m', 'seed world');
}
async function seededStore(dir) {
  const lc = new LiteCtx({ root: join(dir, 'world') });
  for (const [id, body, kind] of NOTES) await lc.remember(id, body, { kind });
  await lc.index();
  return lc;
}

// ---- the one axis: catalog per disclosure condition (neutral wording, no strategy) ----
const IMPACT_LINE = `    { "op": "impact" }                               — enumerate every module in the repo that
                                                      calls the task's target function, injecting
                                                      their code into the worker's context
                                                      (legal in "before-attempt" only).`;
const LOCKED_SUFFIX = `
      NOTE: "impact" is LOCKED for this job. A config that includes it stays valid, but the op
      is skipped at runtime and recorded as a request.`;
export function catalogFor(condition, shellCapUsd = 2) {
  const stock = renderCatalog({ shellCapUsd });
  if (condition === 'D0') return stock;
  const anchor = '    { "op": "compress"';
  const line = condition === 'D2' ? IMPACT_LINE + LOCKED_SUFFIX : IMPACT_LINE;
  return stock.replace(anchor, `${line}\n${anchor}`);
}

// ---- POC-local acceptance: strip-and-count impact ops, then STOCK validation ----
// Schema v1 stays closed; the stripped count is the selection/ask datum.
export function acceptAuthored(config) {
  if (!config || typeof config !== 'object') return { valid: false, reds: [{ code: 'parse-error' }], impactSelected: 0, misplaced: 0, stripped: config };
  const c = JSON.parse(JSON.stringify(config));
  let impactSelected = 0, misplaced = 0;
  for (const slot of Object.keys(c.hooks ?? {})) {
    const ops = Array.isArray(c.hooks[slot]) ? c.hooks[slot] : [];
    const kept = ops.filter((o) => {
      if (o && o.op === 'impact') {
        impactSelected += 1;
        if (slot !== 'before-attempt') misplaced += 1;
        return false;
      }
      return true;
    });
    c.hooks[slot] = kept;
  }
  const { reds } = validateConfig(c, { shellCapUsd: 2 });
  return { valid: reds.length === 0, reds, impactSelected, misplaced, stripped: c };
}

// ---- POC-local interpreter honoring the authored config (mirrors interpret.js
// runOps + middle; gate omitted — POC, both/all conditions identical) ----
// runOps is a FACTORY so the machinery negatives drive the real dispatch path
// token-free (the hhD2yp clobber lived exactly in the code a replica missed).
function makeRunOps({ lc, t, config, condition, emit, target }) {
  const slotOps = (slot) => config.hooks?.[slot] ?? [];
  const recallKinds = (op) => op.kinds ?? config.memory?.recall?.kinds ?? ['fact'];

  return async function runOps(slot, { iteration, gap, context }) {
    for (const op of slotOps(slot)) {
      if (op.op === 'recall') {
        const hits = [];
        for (const kind of recallKinds(op)) {
          hits.push(...await lc.recall(t.task, { kind, n: op.k ?? config.memory?.recall?.k ?? 5, body: true }));
        }
        // APPEND, never assign — authored slots may order [impact, recall], and
        // interpret.js's assignment semantics silently clobbered the impact view
        // (found live in run hhD2yp: D1 workers never saw the callers; P4 void)
        const recallText = hits.map((h) => {
          const body = h.body ?? h.text ?? (h.path ? (lc.get(h.path, { log: false })?.text ?? '') : '');
          return body ? `[recall ${h.id ?? h.path ?? '?'}]\n${body}` : '';
        }).filter(Boolean).join('\n\n');
        context.text = [context.text, recallText].filter(Boolean).join('\n\n');
        emit('hook-op', { slot, op: 'recall', hits: hits.length, iteration });
      } else if (op.op === 'impact') {
        if (condition !== 'D1') { // D2: the ask fires, capability does not
          emit('request-red', { slot, op: 'impact', iteration, meaning: 'locked primitive requested — recorded, skipped' });
          continue;
        }
        const r = await lc.impact(t.symbol);
        if (r && r.callers.length) {
          const files = [...new Set(r.callers.map((c) => c.path))];
          const parts = [`${t.symbol}: ${r.confirmed} confirmed call sites in ${files.length} modules (risk ${r.risk})`];
          for (const f of files) parts.push(`[caller ${f}]\n${lc.get(f, { log: false })?.text ?? ''}`);
          context.text = [context.text, `Code-graph impact view — every module calling ${t.symbol}:\n${parts.join('\n\n')}`].filter(Boolean).join('\n\n');
          emit('hook-op', { slot, op: 'impact', callers: r.confirmed, files: files.length, iteration });
        } else {
          emit('hook-op', { slot, op: 'impact', callers: 0, iteration });
        }
      } else if (op.op === 'compress') {
        const level = op.level ?? config.memory?.compressLevel ?? 'verbatim';
        if (context.text) context.text = await compress({ text: context.text, format: 'js' }, { level });
        emit('hook-op', { slot, op: 'compress', level, iteration });
      } else if (op.op === 'stash') {
        if (gap) lc.stash(`gap-${iteration}`, gap);
        emit('hook-op', { slot, op: 'stash', iteration });
      } else if (op.op === 'remember') {
        // on-green only (validator-enforced); retention hiccups must not un-green (interpret.js doctrine)
        try { await lc.remember(`green-${target.split('/').at(-1)}`, readFileSync(target, 'utf8'), { kind: op.kind ?? 'fact' }); } catch { /* retention-red, delivery stands */ }
        emit('hook-op', { slot, op: 'remember' });
      }
    }
  };
}

async function runAuthored({ config, condition, taskKey, repDir, emit }) {
  const t = TASKS[taskKey];
  const lc = await seededStore(repDir);
  const loop = new Loop({ provider: sealedProvider(), system: PERSONA });
  const target = join(repDir, 'world', t.targetRel);
  const runOps = makeRunOps({ lc, t, config, condition, emit, target });

  const middle = async (iteration, gap) => {
    if (gap) await runOps('after-red', { iteration, gap, context: {} });
    const context = {};
    await runOps('before-attempt', { iteration, context });
    const parts = [t.task, context.text && `Possibly relevant notes:\n${context.text}`, gap && `Previous attempt failed the test suite:\n${gap}`];
    if (config.loop?.shape === 'plan') {
      const p = await askLoop(loop, [`Produce a SHORT numbered implementation plan (2-4 steps) for this task. Plan only, no code.`, ...parts.slice(1), parts[0]].filter(Boolean).join('\n\n'));
      emit('worker-plan', { iteration });
      parts.push(`Follow this plan:\n${p.text}`);
    }
    const r = await askLoop(loop, parts.filter(Boolean).join('\n\n'));
    emit('worker-result', { iteration, costUsd: r.cost ?? null });
    writeFileSync(target, extractArtifact(r.text));
  };
  const effectiveCap = Math.min(CAP, config.loop?.maxIterations ?? CAP);
  return ralph({ middle, close: ['node', '--test', join(repDir, 'closes', t.suite)], capRuns: effectiveCap, emit });
}

// ---- machinery negatives (token-free, measured before any spend) ----
{
  // 1. catalog renders per condition
  const [c0, c1, c2] = ['D0', 'D1', 'D2'].map((d) => catalogFor(d));
  assert.equal(c0, renderCatalog({ shellCapUsd: 2 }), 'machinery: D0 is stock renderCatalog, byte-identical');
  assert.ok(!c0.includes('impact'), 'machinery: D0 must not mention impact');
  assert.ok(c1.includes('"op": "impact"') && !c1.includes('LOCKED'), 'machinery: D1 lists impact, unlocked');
  assert.ok(c2.includes('"op": "impact"') && c2.includes('LOCKED'), 'machinery: D2 lists impact as LOCKED');
  assert.notEqual(c1, c0, 'machinery: the anchor replacement actually landed');
  // 2. acceptance can pass, count, flag misplacement, and FAIL
  const base = { schema: 'v1', loop: { shape: 'refine', maxIterations: 4 }, memory: { store: 'litectx', recall: { k: 5, kinds: ['episode', 'code'] } }, gate: { budgetUsd: 1, writeScope: ['src/**'] }, escalation: { mode: 'decision-ready' } };
  const withImpact = { ...base, hooks: { 'before-attempt': [{ op: 'recall', k: 5 }, { op: 'impact' }] } };
  let a = acceptAuthored(withImpact);
  assert.ok(a.valid && a.impactSelected === 1 && a.misplaced === 0, 'machinery: impact in before-attempt strips to a valid config, count 1');
  a = acceptAuthored({ ...base, hooks: { 'after-red': [{ op: 'impact' }] } });
  assert.ok(a.valid && a.impactSelected === 1 && a.misplaced === 1, 'machinery: misplaced impact counted and stripped');
  a = acceptAuthored({ ...base, close: 'rm -rf' });
  assert.ok(!a.valid, 'machinery: acceptance must still red an illegal field');
  // 3. world negatives (F21's four, re-measured)
  const neg = join(work, 'negatives');
  writeWorld(neg);
  assert.equal(runClose(['node', '--test', join(neg, 'closes', 'format.test.mjs')]).verdict, 'needs_revision', 'machinery: stub must red');
  writeFileSync(join(neg, 'world', 'format.mjs'), REF_FORMAT);
  assert.equal(runClose(['node', '--test', join(neg, 'closes', 'format.test.mjs')]).verdict, 'satisfied', 'machinery: reference must green');
  writeFileSync(join(neg, 'world', 'format.mjs'), STUB_FORMAT);
  const lc = await seededStore(neg);
  const imp = await lc.impact('formatLabel');
  assert.equal(new Set((imp?.callers ?? []).map((c) => c.path)).size, 8, 'machinery: impact must confirm all 8 callers');
  const codeHits = await lc.recall(TASKS.main.task, { kind: 'code', n: 5, body: true });
  assert.ok(codeHits.filter((h) => (h.path ?? '').startsWith('callers/')).length < 8, 'machinery: recall k=5 must not enumerate all 8');
  // 4. extraction handles the F21 crack
  assert.equal(extractArtifact('I think this fixes it.\n```js\nexport const x = 1;\n```\nHope that helps.'), 'export const x = 1;', 'machinery: mid-prose fence -> code only');
  assert.equal(extractArtifact('export const y = 2;'), 'export const y = 2;', 'machinery: bare code passes through');
  // 5+6. dispatch negatives, driven through the REAL makeRunOps (the hhD2yp
  // clobber lived in code a replica missed): D2 must emit request-red and inject
  // nothing; D1 with authored order [impact, recall] must keep BOTH contents.
  {
    const events = [];
    const emitN = (type, data) => events.push({ type, ...(data ?? {}) });
    const cfgOrdered = { ...base, hooks: { 'before-attempt': [{ op: 'impact' }, { op: 'recall', k: 5, kinds: ['episode', 'code'] }] } };
    const mk = (condition) => makeRunOps({ lc, t: TASKS.main, config: cfgOrdered, condition, emit: emitN, target: join(neg, 'world', 'format.mjs') });
    const ctxD2 = {};
    await mk('D2')('before-attempt', { iteration: 0, context: ctxD2 });
    assert.ok(events.some((e) => e.type === 'request-red'), 'machinery: D2 real dispatch emits request-red');
    assert.ok(!(ctxD2.text ?? '').includes('Code-graph'), 'machinery: D2 injects no impact content');
    const ctxD1 = {};
    await mk('D1')('before-attempt', { iteration: 0, context: ctxD1 });
    assert.ok(ctxD1.text.includes('Code-graph impact view'), 'machinery: D1 [impact, recall] order keeps the impact view (the clobber regression)');
    assert.ok(ctxD1.text.includes('[recall '), 'machinery: D1 [impact, recall] order keeps recall content too');
  }
  console.log('machinery: catalogs, acceptance (pass/count/misplace/fail), world (stub red / ref green / impact 8/8 / recall <8), extraction, D2 request-red via real dispatch, D1 op-order composition — all measured green (token-free)\n');
}

if (process.argv.includes('--negatives-only')) {
  console.log('negatives-only: stopping before any spend.');
  process.exit(0);
}

// ---- authoring cells: {D0,D1,D2} x {main,leaf} x REPS, one shot each ----
const stripJson = (t) => (t ?? '').trim().replace(/^```[a-z]*\n?/i, '').replace(/\n?```\s*$/, '');
async function authorOnce(condition, taskKey, rep) {
  const loop = new Loop({ provider: sealedProvider(), system: 'You emit exactly one JSON document and nothing else.' });
  const r = await askLoop(loop, `${catalogFor(condition)}\n\nThe coding task your harness will run:\n${TASKS[taskKey].task}`);
  let config = null;
  try { config = JSON.parse(stripJson(r.text)); } catch { /* parse-error counted in acceptance */ }
  const acc = acceptAuthored(config);
  writeFileSync(join(work, `authored-${condition}-${taskKey}-${rep}.json`), config ? JSON.stringify(config, null, 2) : String(r.text));
  // AS-AUTHORED hooks (impact included, in authored order) — the clobber diagnosis
  // needed op order and loop shape, so both are first-class in the log line now
  const shape = JSON.stringify({ loop: config?.loop ?? null, k: acc.stripped?.memory?.recall?.k ?? null, kinds: acc.stripped?.memory?.recall?.kinds ?? null, hooks: Object.fromEntries(Object.entries(config?.hooks ?? {}).map(([s, o]) => [s, (Array.isArray(o) ? o : []).map((x) => x?.op)])) });
  console.log(`[author:${condition}:${taskKey}:${rep}] ${acc.valid ? 'valid' : 'INVALID'} impact=${acc.impactSelected}${acc.misplaced ? ` (misplaced ${acc.misplaced})` : ''} authored=${shape}`);
  return { ...acc, config };
}

const authored = {};
for (const condition of ['D0', 'D1', 'D2']) {
  for (const taskKey of ['main', 'leaf']) {
    authored[`${condition}-${taskKey}`] = [];
    for (let rep = 0; rep < REPS; rep++) authored[`${condition}-${taskKey}`].push(await authorOnce(condition, taskKey, rep));
  }
}

// ---- run cells: MAIN only, each rep's own authored config ----
const runs = {};
for (const condition of ['D0', 'D1', 'D2']) {
  runs[condition] = [];
  for (let rep = 0; rep < REPS; rep++) {
    const a = authored[`${condition}-main`][rep];
    if (!a.valid) {
      console.log(`[run:${condition}:${rep}] authored-invalid — a result, not a retry`);
      runs[condition].push({ outcome: 'authored-invalid', iterations: 0, impactSelected: a.impactSelected });
      continue;
    }
    const repDir = join(work, `run-${condition}-${rep}`);
    writeWorld(repDir);
    const events = [];
    const spineEmit = makeSpine(join(repDir, 'spine.jsonl'));
    const emit = (type, data) => { events.push({ type, ...(data ?? {}) }); return spineEmit(type, data); };
    let outcome = await runAuthored({ config: a.stripped ? { ...a.stripped, hooks: a.config.hooks ?? {} } : a.config, condition, taskKey: 'main', repDir, emit });
    // a provider crash is instrument, never verdict — excluded from every read (§5b)
    if (events.some((e) => e.type === 'escalation' && e.category === 'provider-red')) outcome = 'provider-red';
    const iterations = events.find((e) => e.type === 'run-end')?.iterations ?? CAP;
    const asked = events.filter((e) => e.type === 'request-red').length;
    console.log(`[run:${condition}:${rep}] ${outcome === 'green' ? `green@${iterations}` : `${outcome} (${iterations} iters)`}${asked ? ` request-reds=${asked}` : ''}`);
    runs[condition].push({ outcome, iterations, impactSelected: a.impactSelected, asked });
  }
}

// ---- the read (pre-registered; selection/ask by count, outcomes by catBeats) ----
const sel = (key) => authored[key].filter((a) => a.impactSelected > 0).length;
const summarize = (rs) => {
  const read = rs.filter((r) => r.outcome !== 'provider-red' && r.outcome !== 'authored-invalid');
  return { greens: read.filter((r) => r.outcome === 'green').length, iters: read.filter((r) => r.outcome === 'green').map((r) => r.iterations), n: read.length, excluded: rs.length - read.length };
};
const catBeats = (x, y) => x.greens > y.greens || (x.greens === y.greens && x.greens > 0 && Math.max(...x.iters) < Math.min(...y.iters));
const show = (s) => `${s.greens}/${s.n} green${s.iters.length ? ` @ [${s.iters.join(',')}]` : ''}${s.excluded ? ` (${s.excluded} excluded)` : ''}`;

console.log('\n—— probe-menu-disclosure readout ——');
console.log(`Q1 selection    : D1-main ${sel('D1-main')}/${REPS} selected impact | D1-leaf ${sel('D1-leaf')}/${REPS} (discrimination)`);
console.log(`Q2 ask channel  : D2-main ${sel('D2-main')}/${REPS} asked for the locked verb | D2-leaf ${sel('D2-leaf')}/${REPS}`);
console.log(`Q3 leak         : D0 ${show(summarize(runs.D0))} | D2 ${show(summarize(runs.D2))} (must be ~; read conditional on authored recall params printed above)`);
console.log(`P4 expression   : D1 ${show(summarize(runs.D1))} (green@1 expected where impact selected)`);
console.log(`evidence: ${work}`);

const q1 = sel('D1-main') >= 2 && sel('D1-leaf') <= 1;
const cargo = sel('D1-main') >= 2 && sel('D1-leaf') >= 2;
const q2 = sel('D2-main') >= 1;
const sD0 = summarize(runs.D0), sD2 = summarize(runs.D2);
const q3Readable = sD0.n >= 2 && sD2.n >= 2;
const leak = q3Readable && (catBeats(sD2, sD0) || catBeats(sD0, sD2));
console.log(`\nP1 discrimination: ${q1 ? 'HOLDS — authors discriminate; flat disclosure fine, tiering is decoration at this size' : cargo ? 'CARGO-CULT — authors grab the verb everywhere; choice management (tiering/curation) earns its complexity' : 'MISS — disclosure alone does not surface capability; unlock must be failure-driven'}`);
console.log(`P2 ask channel: ${q2 ? 'ALIVE — request-reds fire; unlock-by-request viable' : 'DEAD (0 asks) — staged disclosure must key on stall/cap-halt evidence instead'}`);
console.log(`P3 leak: ${!q3Readable ? `UNREADABLE — too few readable cells (D0 ${sD0.n}, D2 ${sD2.n}); rerun the run cells` : leak ? 'DIFFER — inspect authored recall params before reading (named §4b catalog-leak path)' : 'CLEAN — listing without capability moved nothing'}`);
