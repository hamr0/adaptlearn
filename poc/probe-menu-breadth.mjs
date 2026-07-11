#!/usr/bin/env node
// probe-menu-breadth — bareloop de-risk POC, run in the adaptlearn sandbox.
// NOT an adaptlearn result: no version bump, no PRD amendment; the tagged record
// stays at v0.11.1. Pre-registration (predictions committed before any spend):
// poc/menu-breadth-prereg.md.
//
// Question: is MENU BREADTH a wired-in contrast variable — does admitting one
// more *callable* primitive change outcome categorically — or is it decoration?
// M3 kill-switch logic applied to the bareloop primitive-menu axis.
//
// Shape (POC bar: machinery negatives + control + falsifier):
//   menus one knob apart:  A = [recall]   C = [recall, impact]
//   MAIN task:      fix formatLabel under 8 caller constraints (impact has purchase:
//                   recall k=5 structurally cannot enumerate 8 callers; impact can)
//   FALSIFIER task: fix a zero-caller leaf parser (impact provably inert — if C>A
//                   here, mere op presence moved something and the read is void)
//
// Honesty:
// - graduated src/ untouched: schema v1 correctly REJECTS `impact` (named v2
//   exclusion), so op dispatch here is POC-local — a prototype of the bareloop
//   admission registry, never a silent widening of the archived schema.
// - context assembly is token-free (litectx only): the A/C one-block contrast is
//   ASSERTED before spend; all four machinery negatives are MEASURED, not assumed.
// - both arms deliver hit BODIES (fetch-toll composition via litectx get()); the
//   one knob is the selector verb: ranked top-k vs structural-exhaustive.
// - the close is shared by both arms, so gap verbosity (§4b) cancels in the
//   contrast; the read is iterations-to-green / verdict, never a dollar delta.
//
// Wall-clock: 12 sealed runs x <=4 iterations on local claude — expect ~30-90min.
// Throwaway per house rules. Live tokens via local claude (clipipe), subscription.

import { createRequire } from 'node:module';
import { mkdtempSync, writeFileSync, mkdirSync, cpSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { LiteCtx } from 'litectx';
import { makeSpine } from '../src/spine.js';
import { ralph, runClose } from '../src/ralph.js';

const require = createRequire(import.meta.url);
const { Loop } = require('bare-agent');
const { CLIPipeProvider } = require('bare-agent/providers');

const REPS = Number(process.env.REPS ?? 3);
const CAP = 4; // shell iteration budget per run (the M6 anchor cap)
const PERSONA = 'You are a senior engineer. Reply with ONLY the complete contents of the requested JavaScript file — no markdown fences, no commentary. ESM.';
const stripFences = (t) => t.trim().replace(/^```[a-z]*\n?/i, '').replace(/\n?```\s*$/, '');

const work = mkdtempSync(join(tmpdir(), 'probe-menu-'));
const CLI_HOME = join(work, 'cli-home');
mkdirSync(CLI_HOME, { recursive: true });
console.log(`world: ${work}\n`);

const sealedProvider = () => new CLIPipeProvider({
  command: 'claude',
  args: ['-p', '--output-format', 'json', '--disallowedTools', 'Write,Edit,NotebookEdit,Bash,WebFetch,WebSearch,Task,Glob,Grep,Read,TodoWrite'],
  parse: 'claude-json', cwd: CLI_HOME, timeout: 180_000,
});

// ---- the world template (identical furniture for every cell; prereg amendment 3) ----
// 8 caller modules, each carrying exactly one house convention in its comment +
// wrapper. The MAIN suite is the union of their expectations; the task statement
// understates them. FALSIFIER's conventions live in seeded notes instead (recall-
// surfaceable), and its symbol has zero callers (impact-inert).

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
const SUITE_LEAF = `
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
// close-sanity references (never shown to any model)
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
const REF_LEAF = `
export function parseThing(str) {
  if (typeof str !== 'string') throw new TypeError('input must be a string');
  const m = /^([^!]*)(?:!(-?\\d+))?$/.exec(str);
  const level = (m?.[1] ?? '').trim();
  if (!level) throw new RangeError('empty level');
  const count = m[2] === undefined ? 1 : Number(m[2]);
  if (!Number.isInteger(count) || count < 1) throw new RangeError('count must be >= 1');
  return { level: level.toLowerCase(), count };
}
`;
// seeded notes — identical every cell: falsifier conventions + M6-style decoys
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
  falsifier: {
    symbol: 'parseThing', targetRel: 'leaf.mjs', suite: 'leaf.test.mjs',
    task: 'Fix the file leaf.mjs in this repo. Its exported function `parseThing(str)` does not follow the house parsing conventions, and the test suite is failing. Rewrite leaf.mjs (keep the named export `parseThing`) so it conforms. Emit the complete new contents of leaf.mjs.',
  },
};
const MENUS = { A: ['recall'], C: ['recall', 'impact'] };

function writeWorld(dir) {
  mkdirSync(join(dir, 'world', 'callers'), { recursive: true });
  mkdirSync(join(dir, 'closes'), { recursive: true });
  writeFileSync(join(dir, 'world', 'format.mjs'), STUB_FORMAT);
  writeFileSync(join(dir, 'world', 'leaf.mjs'), STUB_LEAF);
  for (const [f, [rule, wrapper]] of Object.entries(CALLERS)) {
    writeFileSync(join(dir, 'world', 'callers', f), `// ${rule}\nimport { formatLabel } from '../format.mjs';\n${wrapper}\n`);
  }
  writeFileSync(join(dir, 'closes', 'format.test.mjs'), SUITE_MAIN);
  writeFileSync(join(dir, 'closes', 'leaf.test.mjs'), SUITE_LEAF);
  // The world must be a REAL git repo with the seed files committed: litectx
  // collectFiles() prefers `git ls-files`, and an empty repo indexes NOTHING
  // (found live — a bare `git init` silently blinded index/impact/recall-code).
  // Explicit paths staged, never -A (house rule).
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

// ---- POC-local op dispatch (the bareloop admission-registry prototype) ----
// Token-free: litectx calls only. Both verbs deliver BODIES (fetch-toll: get()
// is the body-access counterpart of a pointer-returning verb) — the one knob is
// the selector, ranked top-k vs structural-exhaustive.
async function contextBlocks(lc, t, menu, emit = () => {}, iteration = 0) {
  const blocks = [];
  for (const op of menu) {
    if (op === 'recall') {
      const hits = [];
      for (const kind of ['episode', 'code']) hits.push(...await lc.recall(t.task, { kind, n: 5, body: true }));
      for (const h of hits) {
        const id = h.id ?? h.path ?? '?';
        const body = h.body ?? h.text ?? (h.path ? (lc.get(h.path, { log: false })?.text ?? '') : '');
        if (body) blocks.push(`[recall ${id}]\n${body}`);
      }
      emit('hook-op', { op: 'recall', hits: hits.length, iteration });
    } else if (op === 'impact') {
      const r = await lc.impact(t.symbol);
      if (r && r.callers.length) {
        const files = [...new Set(r.callers.map((c) => c.path))];
        const parts = [`${t.symbol}: ${r.confirmed} confirmed call sites in ${files.length} modules (risk ${r.risk})`];
        for (const f of files) parts.push(`[caller ${f}]\n${lc.get(f, { log: false })?.text ?? ''}`);
        blocks.push(`Code-graph impact view — every module calling ${t.symbol}:\n${parts.join('\n\n')}`);
        emit('hook-op', { op: 'impact', callers: r.confirmed, files: files.length, iteration });
      } else {
        blocks.push(`Code-graph impact view: no callers of ${t.symbol} in this repo.`);
        emit('hook-op', { op: 'impact', callers: 0, iteration });
      }
    }
  }
  return blocks;
}

// ---- machinery negatives (token-free, MEASURED before any spend) ----
{
  const neg = join(work, 'negatives');
  writeWorld(neg);
  // stubs must RED (the suite can fail) …
  for (const t of Object.values(TASKS)) {
    const v = runClose(['node', '--test', join(neg, 'closes', t.suite)]);
    assert.equal(v.verdict, 'needs_revision', `machinery: stub ${t.targetRel} must red its suite`);
  }
  // … and the references must GREEN (close sanity; never shown to any model)
  writeFileSync(join(neg, 'world', 'format.mjs'), REF_FORMAT);
  writeFileSync(join(neg, 'world', 'leaf.mjs'), REF_LEAF);
  for (const t of Object.values(TASKS)) {
    const v = runClose(['node', '--test', join(neg, 'closes', t.suite)]);
    assert.equal(v.verdict, 'satisfied', `machinery: reference ${t.targetRel} must green its suite (${v.gap?.slice(0, 300)})`);
  }
  // restore stubs, then measure the store-side negatives on the real furniture
  writeFileSync(join(neg, 'world', 'format.mjs'), STUB_FORMAT);
  writeFileSync(join(neg, 'world', 'leaf.mjs'), STUB_LEAF);
  const lc = await seededStore(neg);
  const imp = await lc.impact('formatLabel');
  const impFiles = new Set((imp?.callers ?? []).map((c) => c.path));
  assert.equal(impFiles.size, 8, `machinery: impact must confirm all 8 caller modules (got ${[...impFiles].join(', ')})`);
  const leafImp = await lc.impact('parseThing');
  assert.ok(leafImp && leafImp.callers.length === 0, 'machinery: falsifier symbol must be defined but caller-free (impact inert)');
  const recBlocks = await contextBlocks(lc, TASKS.main, ['recall']);
  const recCallerFiles = new Set(recBlocks.map((b) => /^\[recall (callers\/[^\]]+)\]/.exec(b)?.[1]).filter(Boolean));
  assert.ok(recCallerFiles.size < 8, `machinery: recall k=5 must NOT enumerate all 8 callers (got ${recCallerFiles.size})`);
  // the A/C contrast is exactly one appended block, on both tasks
  for (const t of Object.values(TASKS)) {
    const bA = await contextBlocks(lc, t, MENUS.A);
    const bC = await contextBlocks(lc, t, MENUS.C);
    assert.equal(bC.length, bA.length + 1, 'machinery: C = A + exactly one impact block');
    assert.deepEqual(bC.slice(0, bA.length), bA, 'machinery: C\'s recall blocks identical to A\'s');
  }
  assert.ok((await contextBlocks(lc, TASKS.falsifier, MENUS.C)).at(-1).includes('no callers'), 'machinery: falsifier impact block must be the inert form');
  console.log(`machinery: stubs red, references green, impact=8/8 callers, recall=${recCallerFiles.size}/8 callers, A/C one-block contrast — all measured green (token-free)\n`);
}

if (process.argv.includes('--negatives-only')) {
  console.log('negatives-only: stopping before any spend.');
  process.exit(0);
}

// ---- the cells: REPS x {main, falsifier} x {A, C}, sequential ----
async function runCell(taskKey, armKey, rep) {
  const t = TASKS[taskKey];
  const repDir = join(work, `${taskKey}-${armKey}-${rep}`);
  writeWorld(repDir);
  const lc = await seededStore(repDir);
  const events = [];
  const spineEmit = makeSpine(join(repDir, 'spine.jsonl'));
  const emit = (type, data) => { events.push({ type, ...(data ?? {}) }); return spineEmit(type, data); };
  const loop = new Loop({ provider: sealedProvider(), system: PERSONA });
  const middle = async (iteration, gap) => {
    const blocks = await contextBlocks(lc, t, MENUS[armKey], emit, iteration);
    const parts = [
      t.task,
      blocks.length ? `Possibly relevant notes:\n${blocks.join('\n\n')}` : null,
      gap ? `Previous attempt failed the test suite:\n${gap}` : null,
    ];
    const r = await loop.run([{ role: 'user', content: parts.filter(Boolean).join('\n\n') }]);
    emit('worker-result', { iteration, costUsd: r.cost ?? null });
    writeFileSync(join(repDir, 'world', t.targetRel), stripFences(r.text ?? ''));
  };
  const outcome = await ralph({ middle, close: ['node', '--test', join(repDir, 'closes', t.suite)], capRuns: CAP, emit });
  const iterations = events.find((e) => e.type === 'run-end')?.iterations ?? CAP;
  console.log(`[${taskKey}:${armKey}:${rep}] ${outcome === 'green' ? `green@${iterations}` : `${outcome} (${iterations} iters)`}`);
  return { outcome, iterations };
}

const cells = { main: { A: [], C: [] }, falsifier: { A: [], C: [] } };
for (let rep = 0; rep < REPS; rep++) {
  for (const taskKey of ['main', 'falsifier']) {
    for (const armKey of ['A', 'C']) {
      cells[taskKey][armKey].push(await runCell(taskKey, armKey, rep));
    }
  }
}

// ---- the read (pre-registered, machine-checked, reported either way) ----
const summarize = (runs) => ({
  greens: runs.filter((r) => r.outcome === 'green').length,
  iters: runs.filter((r) => r.outcome === 'green').map((r) => r.iterations),
});
const catBeats = (x, y) => x.greens > y.greens
  || (x.greens === y.greens && x.greens > 0 && Math.max(...x.iters) < Math.min(...y.iters));
const show = (s, n) => `${s.greens}/${n} green${s.iters.length ? ` @ [${s.iters.join(',')}]` : ''}`;

const mA = summarize(cells.main.A), mC = summarize(cells.main.C);
const fA = summarize(cells.falsifier.A), fC = summarize(cells.falsifier.C);
console.log('\n—— probe-menu-breadth readout (categorical: verdict / iterations-to-green) ——');
console.log(`MAIN      (impact has purchase): A ${show(mA, REPS)} | C ${show(mC, REPS)}`);
console.log(`FALSIFIER (impact inert):        A ${show(fA, REPS)} | C ${show(fC, REPS)}`);
console.log(`evidence: ${work}`);

if (catBeats(fC, fA) || catBeats(fA, fC)) {
  console.log('\nCONFOUND — the arms differ where the extra primitive is provably inert.');
  console.log('Mere op presence moved the outcome; no MAIN gap is attributable to impact. Investigate before believing any read.');
  process.exit(1);
} else if (catBeats(mC, mA)) {
  console.log('\nWIRED-IN — the wide menu beats the narrow one exactly where the extra primitive has purchase, and nowhere else.');
  console.log('Menu breadth is a live contrast variable: bareloop builds the admission registry (disclosure -> request-red -> admit).');
} else {
  console.log('\nDECORATION (pre-registered null) — the extra primitive does not move outcome even where it should.');
  console.log('bareloop admits a fixed base verb set and skips registry machinery until a run demonstrates the gap. A finding, not a tweak.');
  process.exit(1);
}
