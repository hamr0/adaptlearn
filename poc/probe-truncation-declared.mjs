#!/usr/bin/env node
// probe-truncation-declared — bareloop de-risk POC #3, run in the adaptlearn sandbox.
// NOT an adaptlearn result. Pre-registration: poc/truncation-declared-prereg.md.
//
// Question: F21 showed partial retrieval POISONS gap attribution (the narrow-menu
// worker took recall's 4/8 callers as complete and dismissed the 3 real failing
// tests as noise). Is that poisoning LABEL-FIXABLE — does declaring the recall
// block "ranked top-k, may be incomplete" restore attribution — or does it take
// structural-exhaustive verbs (F21's admission answer), the label being hygiene?
// Decides the manifest rule "every amplifier declares its truncation".
//
// One knob: the declaration parenthetical in the context header. Both arms are
// F21's NARROW menu ([recall] only), F21 world verbatim, F22 fixed instrument
// (last-fence extraction, provider retry -> provider-red exclusion) — so this is
// ALSO the first readable look at narrow-arm iterations 2+ (F21's were
// contaminated by the stripFences crack).
//
// Primary read is ATTRIBUTION, not verdict: an observer-only TAP meter (never
// shown to any worker) checks whether the {badge, price, qty} tests — the three
// conventions recall cannot surface, named in every gap — pass on the
// iteration-2 artifact (the first authored AFTER seeing a gap).
//
// Wall-clock: 12 sealed runs x <=4 iterations on local claude — expect ~30-90min.
// Throwaway per house rules. Live tokens via local claude (clipipe), subscription.

import { createRequire } from 'node:module';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
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
const CAP = 4;
const PERSONA = 'You are a senior engineer. Reply with ONLY the complete contents of the requested JavaScript file — no markdown fences, no commentary. ESM.';

const work = mkdtempSync(join(tmpdir(), 'probe-trunc-'));
const CLI_HOME = join(work, 'cli-home');
mkdirSync(CLI_HOME, { recursive: true });
console.log(`world: ${work}\n`);

const sealedProvider = () => new CLIPipeProvider({
  command: 'claude',
  args: ['-p', '--output-format', 'json', '--disallowedTools', 'Write,Edit,NotebookEdit,Bash,WebFetch,WebSearch,Task,Glob,Grep,Read,TodoWrite'],
  parse: 'claude-json', cwd: CLI_HOME, timeout: 180_000,
});

// ---- F22 instrument, carried verbatim (registered) ----
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
// last-fence extraction (the F21 crack, closed in F22) + a persona-break flag:
// fences appearing MID-PROSE (reply didn't start as a bare file) are countable.
export function analyzeReply(text) {
  const t = (text ?? '').trim();
  const blocks = [...t.matchAll(/```[a-z]*\n([\s\S]*?)```/gi)].map((m) => m[1]);
  if (blocks.length) return { artifact: blocks.at(-1).trim(), midProse: !/^```/.test(t) };
  return { artifact: t.replace(/^```[a-z]*\n?/i, '').replace(/\n?```\s*$/, ''), midProse: false };
}

// ---- the ONE KNOB: the context-section header ----
const HEADER_U = 'Possibly relevant notes:';
const HEADER_T = 'Possibly relevant notes (retrieved by ranked top-k search — an INCOMPLETE view: items beyond the top k are not shown; do not treat this list as exhaustive):';
const HEADERS = { U: HEADER_U, T: HEADER_T };
const notesSection = (blocks, arm) => blocks.length ? `${HEADERS[arm]}\n${blocks.join('\n\n')}` : null;

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
// negative #4/#5 fixture: everything EXCEPT the three gapOnly conventions —
// meters exactly 5/8, and its runClose gap must name all three failing tests.
const PARTIAL_FORMAT = `
export function formatLabel(item = {}, opts = {}) {
  let label = item.name ?? '(unnamed)';
  if (item.id !== undefined) label += '#' + item.id;
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
  falsifier: {
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
  writeFileSync(join(dir, 'closes', 'leaf.test.mjs'), SUITE_LEAF);
  // committed seed files — a bare `git init` silently blinds litectx collectFiles
  // (F21 / UPSTREAM-ASKS A3). Explicit paths, never -A.
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

// ---- recall context (F21's A arm verbatim; token-free litectx calls) ----
async function recallBlocks(lc, t, emit = () => {}, iteration = 0) {
  const blocks = [];
  const hits = [];
  for (const kind of ['episode', 'code']) hits.push(...await lc.recall(t.task, { kind, n: 5, body: true }));
  for (const h of hits) {
    const id = h.id ?? h.path ?? '?';
    const body = h.body ?? h.text ?? (h.path ? (lc.get(h.path, { log: false })?.text ?? '') : '');
    if (body) blocks.push(`[recall ${id}]\n${body}`);
  }
  emit('hook-op', { op: 'recall', hits: hits.length, iteration });
  return blocks;
}

// ---- the observer-only per-test meter (TAP; never shown to any worker) ----
const GAP_ONLY = ['badge', 'price', 'qty'];
function meterSuite(suitePath) {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const r = spawnSync('node', ['--test', '--test-reporter=tap', suitePath], { env, encoding: 'utf8', timeout: 120_000 });
  const out = r.stdout || '';
  const passing = [], failing = [];
  for (const m of out.matchAll(/^(not )?ok \d+ - (.+)$/gm)) (m[1] ? failing : passing).push(m[2].trim());
  const gapOnlyPass = GAP_ONLY.filter((p) => passing.some((n) => n.startsWith(`${p}:`))).length;
  return { passing, failing, gapOnlyPass, total: passing.length + failing.length };
}

// ---- machinery negatives (token-free, MEASURED before any spend) ----
{
  const neg = join(work, 'negatives');
  writeWorld(neg);
  // 1. stubs red, references green (close sanity)
  for (const t of Object.values(TASKS)) {
    assert.equal(runClose(['node', '--test', join(neg, 'closes', t.suite)]).verdict, 'needs_revision', `machinery: stub ${t.targetRel} must red its suite`);
  }
  writeFileSync(join(neg, 'world', 'format.mjs'), REF_FORMAT);
  writeFileSync(join(neg, 'world', 'leaf.mjs'), REF_LEAF);
  for (const t of Object.values(TASKS)) {
    const v = runClose(['node', '--test', join(neg, 'closes', t.suite)]);
    assert.equal(v.verdict, 'satisfied', `machinery: reference ${t.targetRel} must green its suite (${v.gap?.slice(0, 300)})`);
  }
  // 4a. the meter can pass: reference meters 8/8 with gapOnly 3/3
  const mRef = meterSuite(join(neg, 'closes', 'format.test.mjs'));
  assert.equal(mRef.passing.length, 8, `machinery: meter must read 8/8 on the reference (got ${mRef.passing.length}/${mRef.total})`);
  assert.equal(mRef.gapOnlyPass, 3, 'machinery: meter must read gapOnly 3/3 on the reference');
  // 4b. the meter can FAIL: partial artifact meters exactly 5/8, gapOnly 0/3
  writeFileSync(join(neg, 'world', 'format.mjs'), PARTIAL_FORMAT);
  const mPart = meterSuite(join(neg, 'closes', 'format.test.mjs'));
  assert.equal(mPart.passing.length, 5, `machinery: partial artifact must meter 5/8 (got ${mPart.passing.length}/${mPart.total})`);
  assert.equal(mPart.gapOnlyPass, 0, 'machinery: partial artifact must meter gapOnly 0/3');
  // 5. the premise "the gap names all three" is measured, not assumed
  const gapV = runClose(['node', '--test', join(neg, 'closes', 'format.test.mjs')]);
  assert.equal(gapV.verdict, 'needs_revision', 'machinery: partial artifact must red the close');
  for (const p of GAP_ONLY) assert.ok(gapV.gap.includes(`${p}:`), `machinery: the 2000-char gap slice must name the failing "${p}" test`);
  // 4c. stub meters gapOnly 0/3
  writeFileSync(join(neg, 'world', 'format.mjs'), STUB_FORMAT);
  writeFileSync(join(neg, 'world', 'leaf.mjs'), STUB_LEAF);
  const mStub = meterSuite(join(neg, 'closes', 'format.test.mjs'));
  assert.equal(mStub.gapOnlyPass, 0, 'machinery: stub must meter gapOnly 0/3');
  // 2. world fidelity to F21: impact 8/8, recall < 8, falsifier inert
  const lc = await seededStore(neg);
  const imp = await lc.impact('formatLabel');
  assert.equal(new Set((imp?.callers ?? []).map((c) => c.path)).size, 8, 'machinery: impact must confirm all 8 caller modules');
  const leafImp = await lc.impact('parseThing');
  assert.ok(leafImp && leafImp.callers.length === 0, 'machinery: falsifier symbol must be caller-free');
  const recBlocks = await recallBlocks(lc, TASKS.main);
  const recCallerFiles = new Set(recBlocks.map((b) => /^\[recall (callers\/[^\]]+)\]/.exec(b)?.[1]).filter(Boolean));
  assert.ok(recCallerFiles.size < 8, `machinery: recall k=5 must NOT enumerate all 8 callers (got ${recCallerFiles.size})`);
  // 6. falsifier conventions are recall-surfaceable
  const leafBlocks = await recallBlocks(lc, TASKS.falsifier);
  for (const id of ['note-thing-format', 'note-thing-edges']) {
    assert.ok(leafBlocks.some((b) => b.startsWith(`[recall ${id}]`)), `machinery: falsifier recall must surface ${id}`);
  }
  // 3. the ONE KNOB, byte-asserted on both tasks
  for (const t of Object.values(TASKS)) {
    const blocks = await recallBlocks(lc, t);
    const u = notesSection(blocks, 'U'), tt = notesSection(blocks, 'T');
    assert.equal(tt, u.replace(HEADER_U, HEADER_T), `machinery: T context = U context + declaration ONLY (${t.targetRel})`);
    assert.equal(tt.split('\n').slice(1).join('\n'), u.split('\n').slice(1).join('\n'), 'machinery: bodies byte-identical below the header');
  }
  // 7. extraction handles the F21 crack; persona-break flag works
  assert.deepEqual(analyzeReply('I think this fixes it.\n```js\nexport const x = 1;\n```\nDone.'), { artifact: 'export const x = 1;', midProse: true }, 'machinery: mid-prose fence -> code only, flagged');
  assert.deepEqual(analyzeReply('export const y = 2;'), { artifact: 'export const y = 2;', midProse: false }, 'machinery: bare code passes through, unflagged');
  console.log('machinery: stubs red / refs green, meter 8-8 & 5-8 & gapOnly 0-3, gap names all three, impact 8/8, recall <8, falsifier notes surfaceable, one-knob byte assert, extraction crack — all measured green (token-free)\n');
}

if (process.argv.includes('--negatives-only')) {
  console.log('negatives-only: stopping before any spend.');
  process.exit(0);
}

// ---- the cells: REPS x {main, falsifier} x {U, T}, sequential ----
async function runCell(taskKey, armKey, rep) {
  const t = TASKS[taskKey];
  const repDir = join(work, `${taskKey}-${armKey}-${rep}`);
  writeWorld(repDir);
  const lc = await seededStore(repDir);
  const events = [];
  const spineEmit = makeSpine(join(repDir, 'spine.jsonl'));
  const emit = (type, data) => { events.push({ type, ...(data ?? {}) }); return spineEmit(type, data); };
  const loop = new Loop({ provider: sealedProvider(), system: PERSONA });
  const meters = {};
  let personaBreaks = 0;
  const middle = async (iteration, gap) => {
    const blocks = await recallBlocks(lc, t, emit, iteration);
    const parts = [
      t.task,
      notesSection(blocks, armKey),
      gap ? `Previous attempt failed the test suite:\n${gap}` : null,
    ];
    const r = await askLoop(loop, parts.filter(Boolean).join('\n\n'));
    emit('worker-result', { iteration, costUsd: r.cost ?? null });
    const { artifact, midProse } = analyzeReply(r.text ?? '');
    if (midProse) { personaBreaks += 1; emit('persona-break', { iteration }); }
    writeFileSync(join(repDir, 'world', t.targetRel), artifact);
    writeFileSync(join(repDir, `artifact-${iteration}.mjs`), artifact);
    const m = meterSuite(join(repDir, 'closes', t.suite));
    meters[iteration] = m;
    emit('meter', { iteration, pass: m.passing.length, total: m.total, gapOnlyPass: m.gapOnlyPass });
  };
  let outcome = await ralph({ middle, close: ['node', '--test', join(repDir, 'closes', t.suite)], capRuns: CAP, emit });
  if (events.some((e) => e.type === 'escalation' && e.category === 'provider-red')) outcome = 'provider-red';
  const iterations = events.find((e) => e.type === 'run-end')?.iterations ?? CAP;
  const trail = Object.entries(meters).map(([i, m]) => `@${i}:${m.passing.length}/${m.total}(gap ${m.gapOnlyPass}/3)`).join(' ');
  console.log(`[${taskKey}:${armKey}:${rep}] ${outcome === 'green' ? `green@${iterations}` : `${outcome} (${iterations} iters)`}  ${trail}${personaBreaks ? `  persona-breaks=${personaBreaks}` : ''}`);
  return { outcome, iterations, meters, personaBreaks };
}

const cells = { main: { U: [], T: [] }, falsifier: { U: [], T: [] } };
for (let rep = 0; rep < REPS; rep++) {
  for (const taskKey of ['main', 'falsifier']) {
    for (const armKey of ['U', 'T']) {
      cells[taskKey][armKey].push(await runCell(taskKey, armKey, rep));
    }
  }
}

// ---- the read (pre-registered, machine-checked, reported either way) ----
const readable = (runs) => runs.filter((r) => r.outcome !== 'provider-red');
const summarize = (runs) => {
  const rs = readable(runs);
  return { greens: rs.filter((r) => r.outcome === 'green').length, iters: rs.filter((r) => r.outcome === 'green').map((r) => r.iterations), n: rs.length, excluded: runs.length - rs.length };
};
const catBeats = (x, y) => x.greens > y.greens
  || (x.greens === y.greens && x.greens > 0 && Math.max(...x.iters) < Math.min(...y.iters));
const show = (s) => `${s.greens}/${s.n} green${s.iters.length ? ` @ [${s.iters.join(',')}]` : ''}${s.excluded ? ` (${s.excluded} provider-red excluded)` : ''}`;

// attribution: ATTRIBUTED iff >=2/3 gapOnly pass on the iteration-2 artifact
const attribution = (runs) => {
  let attributed = 0, breach = 0, n = 0;
  for (const r of readable(runs)) {
    if (r.outcome === 'green' && r.iterations === 1) { breach += 1; continue; } // guessability breach, flagged + excluded
    if (!r.meters[2]) continue; // never reached iteration 2 (provider path) — not countable
    n += 1;
    if (r.meters[2].gapOnlyPass >= 2) attributed += 1;
  }
  return { attributed, n, breach };
};
const aU = attribution(cells.main.U), aT = attribution(cells.main.T);
const mU = summarize(cells.main.U), mT = summarize(cells.main.T);
const fU = summarize(cells.falsifier.U), fT = summarize(cells.falsifier.T);
const gap1 = (runs) => readable(runs).map((r) => r.meters[1]?.gapOnlyPass ?? '-').join(',');

console.log('\n—— probe-truncation-declared readout (primary: attribution@2; secondary: verdict/iterations) ——');
console.log(`MAIN attribution@2 : U ${aU.attributed}/${aU.n} attributed | T ${aT.attributed}/${aT.n} attributed${aU.breach + aT.breach ? `  (guessability breaches: U ${aU.breach}, T ${aT.breach})` : ''}`);
console.log(`MAIN outcome       : U ${show(mU)} | T ${show(mT)}`);
console.log(`FALSIFIER outcome  : U ${show(fU)} | T ${show(fT)}`);
console.log(`iteration-1 gapOnly (must be 0s, both arms): U [${gap1(cells.main.U)}] T [${gap1(cells.main.T)}]`);
console.log(`persona-breaks: main U ${cells.main.U.reduce((s, r) => s + r.personaBreaks, 0)}, T ${cells.main.T.reduce((s, r) => s + r.personaBreaks, 0)}; falsifier U ${cells.falsifier.U.reduce((s, r) => s + r.personaBreaks, 0)}, T ${cells.falsifier.T.reduce((s, r) => s + r.personaBreaks, 0)}`);
console.log(`evidence: ${work}`);

if (catBeats(fT, fU) || catBeats(fU, fT)) {
  console.log('\nCONFOUND — the arms differ where the declaration is content-inert.');
  console.log('The label is doing generic (non-informational) work; no clean attribution read. Investigate before believing anything.');
  process.exit(1);
} else if (aT.attributed > aU.attributed) {
  console.log('\nLABEL-FIXES — declaring the truncation restored gap attribution in the narrow arm, and moved nothing where it was inert.');
  console.log('"Every amplifier declares its truncation" is LOAD-BEARING: bareloop prompt assembly adopts it (ranked views always declare; only exhaustive views may claim exhaustiveness). F21\'s admission verdict stands unchanged.');
} else {
  console.log('\nLABEL-INSUFFICIENT (pre-registered null) — the poisoning persists under a declared truncation.');
  console.log('Attribution is only fixed structurally (exhaustive verbs / admission); the manifest rule is demoted to hygiene. A finding, not a tweak.');
}
