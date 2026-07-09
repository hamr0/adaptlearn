#!/usr/bin/env node
// probe-03b — the F7 falsifier: MAX config, EMPTY store (no seeding), n=2.
// F7's causal reading says MAX's fast green is carried by recall-of-seeds, not by
// loop shape / slot mechanics alone. This control holds everything at MAX except
// the store. If unseeded MAX first attempts still satisfy the note-carried house
// conventions (or green as fast as seeded MAX), the causal channel was NOT the
// notes and F7 overclaims — that correction would be the result.
//
// Primary metric is FIRST-ATTEMPT convention compliance (which note-carried
// conventions the iteration-1 artifact fails), not verdict/iterations: observed
// within-config iteration noise (seeded MAX greened @1 and @4) makes verdict-at-
// n=2 weak, while first attempts are untouched by later syntax-fumble noise.
// Reference points from the seeded runs (F7): seeded MAX first attempts failed
// 0 and 1 of the 5 note-carried conventions; unseeded MIN failed 2 both runs.
//
// Throwaway per house rules. Live tokens via local claude (clipipe), subscription.

import { createRequire } from 'node:module';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { makeSpine } from '../src/spine.js';
import { interpret } from '../src/interpret.js';
import { validateConfig } from '../src/validate.js';

const require = createRequire(import.meta.url);
const { CLIPipeProvider } = require('bare-agent/providers');

const MAX = JSON.parse(readFileSync(new URL('../tests/fixtures/contrast-max.json', import.meta.url), 'utf8'));
assert.ok(validateConfig(MAX).ok, 'MAX fixture must be schema-legal');

// identical task + GOLD close as probe-03 — the control varies ONLY the store
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
// the 5 note-carried conventions, by close subtest name (generic tests excluded)
const NOTE_CONVENTIONS = [
  'single spaces between components allowed',
  'unit letters are case-insensitive',
  'bare numeric string means milliseconds',
  'negative durations throw RangeError',
  'empty or non-string input throws TypeError',
];

const work = mkdtempSync(join(tmpdir(), 'probe03b-'));
console.log(`world: ${work}\n`);

async function runControl(name) {
  const workdir = join(work, name);
  mkdirSync(join(workdir, 'src'), { recursive: true });
  const target = join(workdir, 'src', 'dur.mjs');
  const suite = join(workdir, 'src', 'dur.test.mjs');
  writeFileSync(suite, SUITE);
  // NO seeding — the control condition. litectx store starts empty.

  const cliHome = join(workdir, 'cli-home');
  mkdirSync(cliHome, { recursive: true });
  const provider = new CLIPipeProvider({
    command: 'claude',
    args: ['-p', '--output-format', 'json', '--disallowedTools', 'Write,Edit,NotebookEdit,Bash,WebFetch,WebSearch,Task,Glob,Grep,Read,TodoWrite'],
    parse: 'claude-json', cwd: cliHome, timeout: 180_000,
  });
  const spineFile = join(work, `spine-${name}.jsonl`);
  const outcome = await interpret(MAX, {
    task: TASK, target, close: ['node', '--test', suite], workdir,
    capRuns: 4, emit: makeSpine(spineFile), provider, shellCapUsd: 2,
  });

  const events = readFileSync(spineFile, 'utf8').trimEnd().split('\n').map((l) => JSON.parse(l));
  const recallHits = events.filter((e) => e.type === 'hook-op' && e.op === 'recall')
    .reduce((s, e) => s + (e.hits ?? 0), 0);
  // machinery: recall must FIRE (MAX slots active) yet hit NOTHING (store empty),
  // or this is not the intended control condition.
  const recallFired = events.some((e) => e.type === 'hook-op' && e.op === 'recall');
  assert.ok(recallFired, `${name}: MAX recall op must fire`);
  assert.equal(recallHits, 0, `${name}: store must be empty — a hit means the control is contaminated`);

  const verdicts = events.filter((e) => e.type === 'close-verdict');
  const first = verdicts[0];
  const firstNotOk = (first?.gap ?? '').split('\n').filter((l) => l.startsWith('not ok')).map((l) => l.replace(/^not ok \d+ - /, ''));
  const firstConventionMisses = first?.verdict === 'satisfied' ? []
    : firstNotOk.some((t) => t.includes('.test.mjs')) ? ['(syntax error — first attempt unreadable)']
    : NOTE_CONVENTIONS.filter((c) => firstNotOk.some((t) => t.includes(c)));
  const end = events.find((e) => e.type === 'run-end');
  const cost = events.filter((e) => e.type === 'worker-result' || e.type === 'worker-plan')
    .reduce((s, e) => s + (e.costUsd ?? 0), 0);
  const r = { outcome, iterations: end?.iterations ?? null, firstConventionMisses, verdicts: verdicts.map((v) => v.verdict), costUsd: +cost.toFixed(4) };
  console.log(`[${name}] → ${outcome} @ ${r.iterations} iters ($${r.costUsd}); first-attempt convention misses: ${JSON.stringify(firstConventionMisses)}`);
  return r;
}

const c1 = await runControl('control-1');
const c2 = await runControl('control-2');

console.log('\n—— F7 falsifier readout (reported either way) ——');
console.log('seeded-MAX reference (F7): first attempts missed 0 and 1 of 5 note conventions; greens @1 and @4');
for (const [n, c] of [['control-1', c1], ['control-2', c2]]) {
  console.log(`${n}: ${c.outcome} @ ${c.iterations}; first attempt missed ${c.firstConventionMisses.length} → ${JSON.stringify(c.firstConventionMisses)}`);
}
console.log('\nIf unseeded first attempts miss ~0 conventions and green fast, F7\'s causal reading OVERCLAIMS (correct it).');
console.log('If they miss the note-carried conventions like MIN did, the recall channel is confirmed as causal.');
console.log(`evidence: ${work}`);
