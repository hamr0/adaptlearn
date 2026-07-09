#!/usr/bin/env node
// probe-03 — M3 POC: the contrast check, the ladder's kill-switch (PRD §6 M3;
// design docs/plans/2026-07-08-schema-v1-design.md §"M3 acceptance test").
//
// Two hand-authored OPPOSED configs — MAX (refine, maxIterations 8, recall k=20
// both kinds, verbatim, all slots populated) vs MIN (plan, recall k=1, drop,
// slots empty) — run live on the SAME task, close, shell caps, provider, and an
// IDENTICALLY pre-seeded store. Exit criterion: a categorical difference
// (verdict, or iterations-to-green) on ≥1 task. Identical outcomes on every
// probe task ⇒ the schema's variables are not wired in ⇒ STOP the ladder.
//
// Design notes (honesty constraints):
// - The store is pre-seeded identically for both runs, simulating run-N
//   retention — the axis the schema claims to wire. Without it the memory knobs
//   are provably inert within-run: litectx stash is a dumb keyed blob, recall
//   never returns it (upstream works-as-intended; FINDINGS F6).
// - Seeds are house-convention PROSE (plus one irrelevant decoy), never code.
//   The close tests conventions the task statement understates; the shell feeds
//   the gap to BOTH configs, so MIN can converge via iteration. The honest
//   prediction is a difference in iterations-to-green — and the probe can fail:
//   if the worker guesses the conventions first try, or recall isn't actually
//   wired into the worker's context, the pair matches.
// - Assertions below cover probe MACHINERY only. The contrast outcome is a
//   MEASURED RESULT, reported either way — a matching pair is the STOP signal
//   (a result), not a probe failure.
//
// Throwaway per house rules. Live tokens via local claude (clipipe), subscription.

import { createRequire } from 'node:module';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { LiteCtx } from 'litectx';
import { makeSpine } from '../src/spine.js';
import { interpret } from '../src/interpret.js';
import { validateConfig, diffPaths } from '../src/validate.js';

const require = createRequire(import.meta.url);
const { CLIPipeProvider } = require('bare-agent/providers');

// ---- the opposed pair (design §M3, verbatim; gate/escalation identical — not axes) ----
const MAX = {
  schema: 'v1',
  loop: { shape: 'refine', maxIterations: 8 },
  memory: { store: 'litectx', recall: { k: 20, kinds: ['fact', 'episode'] }, compressLevel: 'verbatim' },
  hooks: {
    'before-attempt': [{ op: 'recall', k: 20, kinds: ['fact', 'episode'] }, { op: 'compress' }],
    'after-red': [{ op: 'stash' }],
    'on-green': [{ op: 'remember', kind: 'fact' }],
  },
  gate: { budgetUsd: 2, writeScope: ['src/**'] },
  escalation: { mode: 'decision-ready' },
};
const MIN = {
  schema: 'v1',
  loop: { shape: 'plan' },
  memory: { store: 'litectx', recall: { k: 1 }, compressLevel: 'drop' },
  hooks: {},
  gate: { budgetUsd: 2, writeScope: ['src/**'] },
  escalation: { mode: 'decision-ready' },
};

// ---- probe task: single function with an understated house contract ----
// The task statement is deliberately thinner than the close. The close is GOLD
// (shell-owned, hand-authored); the seeded notes state the contract in prose.
const TASK = 'Implement the file dur.mjs. It must export a named function `parseDuration(str)` that parses a duration string (like "1h30m" or "500ms") and returns the total number of milliseconds.';
const SUITE = `
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDuration } from './dur.mjs';
test('basic units', () => {
  assert.equal(parseDuration('90s'), 90_000);
  assert.equal(parseDuration('1h30m'), 5_400_000);
  assert.equal(parseDuration('500ms'), 500);
});
test('fractions allowed', () => assert.equal(parseDuration('1.5h'), 5_400_000));
test('single spaces between components allowed', () => assert.equal(parseDuration('2h 15m'), 8_100_000));
test('unit letters are case-insensitive', () => assert.equal(parseDuration('1H30M'), 5_400_000));
test('bare numeric string means milliseconds', () => assert.equal(parseDuration('250'), 250));
test('negative durations throw RangeError', () => assert.throws(() => parseDuration('-5m'), RangeError));
test('empty or non-string input throws TypeError', () => {
  assert.throws(() => parseDuration(''), TypeError);
  assert.throws(() => parseDuration(42), TypeError);
});
`;

// House-convention prose seeds (identical for both runs) + one decoy so a wide
// recall carries realistic noise, not a curated answer sheet.
const SEEDS = [
  ['note-duration-format', 'Duration format house spec: valid units are h, m, s, and ms; components may be separated by single spaces (e.g. "2h 15m"); unit letters are case-insensitive, so "1H30M" equals "1h30m". Fractional values like "1.5h" are allowed.'],
  ['note-duration-edges', 'Duration parsing edge rules: a bare numeric string with no unit (e.g. "250") means milliseconds; negative durations are invalid and must throw a RangeError; empty strings and non-string input must throw a TypeError.'],
  ['note-decoy-spine', 'The event spine is append-only JSONL: type first, seq monotonic per spine, ts stamped last as the final key; consumers are pure listeners and never read the file back.'],
];

// ---- machinery preflight (each can fail) ----
for (const [name, cfg] of [['MAX', MAX], ['MIN', MIN]]) {
  const v = validateConfig(cfg);
  assert.ok(v.ok, `${name} must be schema-legal: ${JSON.stringify(v.reds)}`);
}
const opposed = diffPaths(MAX, MIN);
assert.ok(opposed.length >= 4, `the pair must be genuinely opposed (got ${JSON.stringify(opposed)})`);
console.log(`opposed on ${opposed.length} paths: ${opposed.join(', ')}\n`);

// ---- run one config in an isolated, identically-prepared world ----
const work = mkdtempSync(join(tmpdir(), 'probe03-'));
async function runArm(name, config) {
  const workdir = join(work, name);
  mkdirSync(join(workdir, 'src'), { recursive: true });
  const target = join(workdir, 'src', 'dur.mjs');
  const suite = join(workdir, 'src', 'dur.test.mjs');
  writeFileSync(suite, SUITE);

  const lc = new LiteCtx({ root: workdir }); // pre-seed = simulate run-N retention
  for (const [id, text] of SEEDS) await lc.remember(id, text, { kind: 'fact' });
  const seeded = await lc.recall('duration', { kind: 'fact', n: 20 });
  assert.ok(seeded.length >= 2, `${name}: store must actually be seeded (got ${seeded.length} hits)`);

  const spineFile = join(work, `spine-${name}.jsonl`);
  // Sealed worker binding (FINDINGS F8): `claude -p` is the FULL CLI with tools —
  // left open it writes files in cwd OUTSIDE bareguard's gate, reads the repo's
  // CLAUDE.md as context, and (from iteration 2, when gap text carries the suite's
  // file:// path) could read the close's tests and fit-to-pass. Tools disallowed +
  // cwd pinned to an empty sandbox dir = the worker is tool-free in FACT, not by
  // assumption. The provider binding is shell-owned (design decision 6), so this
  // seal lives here, never in the config.
  const cliHome = join(workdir, 'cli-home');
  mkdirSync(cliHome, { recursive: true });
  const provider = new CLIPipeProvider({
    command: 'claude',
    args: ['-p', '--output-format', 'json', '--disallowedTools', 'Write,Edit,NotebookEdit,Bash,WebFetch,WebSearch,Task,Glob,Grep,Read,TodoWrite'],
    parse: 'claude-json', cwd: cliHome, timeout: 180_000,
  });
  const outcome = await interpret(config, {
    task: TASK, target, close: ['node', '--test', suite], workdir,
    capRuns: 4, emit: makeSpine(spineFile), provider, shellCapUsd: 2,
  });

  const events = readFileSync(spineFile, 'utf8').trimEnd().split('\n').map((l) => JSON.parse(l));
  const end = events.find((e) => e.type === 'run-end');
  const verdicts = events.filter((e) => e.type === 'close-verdict').map((e) => e.verdict);
  const cost = events.filter((e) => e.type === 'worker-result' || e.type === 'worker-plan')
    .reduce((s, e) => s + (e.costUsd ?? 0), 0);
  const recallHits = events.filter((e) => e.type === 'hook-op' && e.op === 'recall')
    .reduce((s, e) => s + (e.hits ?? 0), 0);
  const r = { outcome, iterations: end?.iterations ?? null, verdicts, costUsd: +cost.toFixed(4), recallHits, spineFile };
  console.log(`[${name}] → ${outcome} in ${r.iterations} iteration(s); verdicts=[${verdicts}]; recall hits=${recallHits}; ~$${r.costUsd}`);
  return r;
}

console.log(`world: ${work}\n`);
const max = await runArm('MAX', MAX);
const min = await runArm('MIN', MIN);

// machinery: MAX's recall must have actually surfaced the seeded store — if this
// fails the memory axis never had a chance and the contrast below is meaningless.
assert.ok(max.recallHits > 0, 'MAX recall surfaced nothing — memory axis not exercised, probe invalid');
assert.equal(min.recallHits, 0, 'MIN has empty slots — a recall hit means the arms are not opposed as authored');

// ---- the measurement (reported either way — never asserted) ----
const categorical =
  max.outcome !== min.outcome ? `verdict: MAX=${max.outcome} vs MIN=${min.outcome}`
  : max.outcome === 'green' && max.iterations !== min.iterations ? `iterations-to-green: MAX=${max.iterations} vs MIN=${min.iterations}`
  : null;

console.log('\n—— M3 contrast ——');
console.log(`MAX: ${max.outcome} @ ${max.iterations} iters ($${max.costUsd})  |  MIN: ${min.outcome} @ ${min.iterations} iters ($${min.costUsd})`);
if (categorical) {
  console.log(`CATEGORICAL DIFFERENCE — ${categorical}`);
  console.log('M3 exit criterion MET on this task: the schema variable is wired in.');
} else {
  console.log('IDENTICAL OUTCOMES on this task (cost deltas do not count — ~10x noisy).');
  console.log('Per design §M3: try further probe tasks; identical on EVERY probe task ⇒ STOP the ladder, redesign the schema.');
}
console.log(`evidence: ${work}`);
