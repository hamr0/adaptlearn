#!/usr/bin/env node
// probe-04 — M4 POC: agent authorship (PRD §6 M4).
// Riskiest assumption: an agent given ONLY the task + the schema v1 catalog can
// author a VALID config, first shot. Exit: parity with the fixed pipe (the
// M2-proven valid.json config) on a small easy cohort, under cap, fit-to-pass
// counted.
//
// Honesty rules built in:
// - The author call is sealed (same F8 binding as workers) and sees the TASK
//   ONLY — never the close/tests (config-level fit-to-pass is closed off) and
//   never strategy hints (the catalog describes the space, it does not coach).
// - ONE authorship attempt per task, no retry. An invalid authored config is a
//   config-red at zero worker tokens and counts as that task's agent-arm miss.
// - Both arms run with EMPTY stores: the cohort is easy by design (store effects
//   were M3's question, answered). Machinery assertion: the hand arm must green
//   on >= 2/3 tasks, else the cohort is not "easy" and the probe is INVALID —
//   parity between two drowning arms proves nothing.
// - Fit-to-pass surface: workers are tool-free in fact (F8 seal) and the close
//   is GOLD + unseen; the only remaining surface is gap text (test names) which
//   both arms receive identically from the shell. Counted: see report.
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
const { Loop } = require('bare-agent');
const { CLIPipeProvider } = require('bare-agent/providers');

const sealedProvider = () => new CLIPipeProvider({
  command: 'claude',
  args: ['-p', '--output-format', 'json', '--disallowedTools', 'Write,Edit,NotebookEdit,Bash,WebFetch,WebSearch,Task,Glob,Grep,Read,TodoWrite'],
  parse: 'claude-json', cwd: CLI_HOME, timeout: 180_000,
});

// ---- the catalog: a faithful rendering of schema v1 (design doc), no coaching ----
const CATALOG = `You are configuring an automated coding harness. It will run a worker LLM in a
loop to write ONE JavaScript file; a hidden test suite (which neither you nor the worker ever
sees) judges each attempt, and its failure output is fed back to the worker on each red. You do
not write code — you author the harness config only.

The config is one JSON document, schema v1. Exact shape:

- "schema": must be "v1". (required)
- "loop": { "shape": "refine" | "plan", "maxIterations": integer 1-8 (optional) }. "shape" is
  required. "refine" = one worker call per iteration; "plan" = a decompose call then an
  implement call per iteration.
- "memory": { "store": "litectx" (required), "recall": { "k": integer 1-20, "kinds": array from
  ["code","doc","fact","episode"] } (optional), "compressLevel": "verbatim" | "signature" |
  "drop" (optional) }. The store starts EMPTY for this task and persists across iterations.
- "hooks": optional; up to 3 slots — "before-attempt" (runs before each worker call),
  "after-red" (runs after a failed judgement, with the failure text available), "on-green"
  (runs once after success). Max 2 ops per slot. Ops:
    { "op": "recall", "k": 1-20, "kinds": [...] }   — pull matching notes from the store into
                                                      the worker's context (before-attempt).
    { "op": "compress", "level": "verbatim"|"signature"|"drop" } — compress recalled context.
    { "op": "stash" }                                — park the failure text in the store by key.
    { "op": "remember", "kind": "fact"|"episode" }   — save the artifact to the store; ONLY
                                                      legal in "on-green".
- "gate": { "budgetUsd": number > 0 and <= 2, "writeScope": non-empty array of path prefixes
  relative to the run directory; a trailing "/**" or "/*" covers everything under a directory,
  and no other wildcard placement is legal }. Both required. This caps the run's spend and where
  the artifact may be written. Run contract: the harness writes the artifact file inside the
  run directory's "src/" folder — a writeScope that does not cover it denies every write.
- "escalation": { "mode": "decision-ready" }. Required, exactly this value.

No other fields exist. Anything else (including any attempt to set the judge, tests, provider,
or model) makes the config invalid. Output ONLY the JSON document — no markdown fences, no
commentary.`;

// ---- easy cohort: 3 single-function tasks, GOLD closes, uncrafted ----
const COHORT = [
  {
    name: 'clamp',
    task: 'Implement the file clamp.mjs. It must export a named function `clamp(x, lo, hi)` that returns x limited to the inclusive range [lo, hi].',
    suite: `
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clamp } from './clamp.mjs';
test('inside range', () => assert.equal(clamp(5, 0, 10), 5));
test('below', () => assert.equal(clamp(-3, 0, 10), 0));
test('above', () => assert.equal(clamp(42, 0, 10), 10));
test('at bounds', () => { assert.equal(clamp(0, 0, 10), 0); assert.equal(clamp(10, 0, 10), 10); });
`,
  },
  {
    name: 'unique',
    task: 'Implement the file unique.mjs. It must export a named function `unique(arr)` that returns a new array with duplicate values removed, preserving first-occurrence order.',
    suite: `
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unique } from './unique.mjs';
test('dedupes preserving order', () => assert.deepEqual(unique([3, 1, 3, 2, 1]), [3, 1, 2]));
test('empty', () => assert.deepEqual(unique([]), []));
test('no dupes untouched', () => assert.deepEqual(unique(['a', 'b']), ['a', 'b']));
test('does not mutate input', () => { const a = [1, 1, 2]; unique(a); assert.deepEqual(a, [1, 1, 2]); });
`,
  },
  {
    name: 'slugify',
    task: 'Implement the file slugify.mjs. It must export a named function `slugify(str)` that converts a string to a lowercase hyphen-separated slug (letters and digits kept, runs of other characters become single hyphens, no leading/trailing hyphens).',
    suite: `
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify } from './slugify.mjs';
test('basic', () => assert.equal(slugify('Hello World'), 'hello-world'));
test('punctuation runs collapse', () => assert.equal(slugify('a -- b!!c'), 'a-b-c'));
test('trims hyphens', () => assert.equal(slugify('  Hello  '), 'hello'));
test('digits kept', () => assert.equal(slugify('Top 10 Files'), 'top-10-files'));
`,
  },
];

const HAND = JSON.parse(readFileSync(new URL('../tests/fixtures/valid.json', import.meta.url), 'utf8'));
const work = mkdtempSync(join(tmpdir(), 'probe04-'));
const CLI_HOME = join(work, 'cli-home');
mkdirSync(CLI_HOME, { recursive: true });
console.log(`world: ${work}\n`);

const stripFences = (t) => t.trim().replace(/^```[a-z]*\n?/i, '').replace(/\n?```\s*$/, '');

// ---- stage A: authorship (one shot per task, validity measured not retried) ----
async function author(taskName, task) {
  const loop = new Loop({ provider: sealedProvider(), system: 'You emit exactly one JSON document and nothing else.' });
  const r = await loop.run([{ role: 'user', content: `${CATALOG}\n\nThe coding task your harness will run:\n${task}` }]);
  let config = null, parseError = null;
  try { config = JSON.parse(stripFences(r.text)); } catch (e) { parseError = String(e.message); }
  const v = config ? validateConfig(config) : { ok: false, reds: [{ code: 'parse-error', path: '$', detail: parseError }] };
  // evidence: persist exactly what was authored (round 1's gap — the configs vanished)
  writeFileSync(join(work, `authored-${taskName}.json`), config ? JSON.stringify(config, null, 2) : stripFences(r.text));
  console.log(`[author:${taskName}] ${v.ok ? 'VALID' : `INVALID: ${JSON.stringify(v.reds)}`} (~$${(r.cost ?? 0).toFixed(4)})`);
  return { config, valid: v.ok, reds: v.reds, costUsd: r.cost ?? 0 };
}

// ---- run one arm on one task ----
async function runArm(armName, taskDef, config) {
  const workdir = join(work, `${taskDef.name}-${armName}`);
  mkdirSync(join(workdir, 'src'), { recursive: true });
  const target = join(workdir, 'src', `${taskDef.name}.mjs`);
  const suite = join(workdir, 'src', `${taskDef.name}.test.mjs`);
  writeFileSync(suite, taskDef.suite);
  const spineFile = join(work, `spine-${taskDef.name}-${armName}.jsonl`);
  const outcome = await interpret(config, {
    task: taskDef.task, target, close: ['node', '--test', suite], workdir,
    capRuns: 3, emit: makeSpine(spineFile), provider: sealedProvider(), shellCapUsd: 2,
  });
  const events = readFileSync(spineFile, 'utf8').trimEnd().split('\n').map((l) => JSON.parse(l));
  const end = events.find((e) => e.type === 'run-end');
  const cost = events.filter((e) => e.type === 'worker-result' || e.type === 'worker-plan')
    .reduce((s, e) => s + (e.costUsd ?? 0), 0);
  return { outcome, iterations: end?.iterations ?? 0, costUsd: +cost.toFixed(4) };
}

// ---- the cohort ----
const rows = [];
for (const taskDef of COHORT) {
  const authored = await author(taskDef.name, taskDef.task);
  const agent = authored.valid
    ? await runArm('agent', taskDef, authored.config)
    : { outcome: 'config-red', iterations: 0, costUsd: 0 };
  const hand = await runArm('hand', taskDef, HAND);
  rows.push({ task: taskDef.name, authored, agent, hand });
  console.log(`[${taskDef.name}] agent → ${agent.outcome} @ ${agent.iterations} ($${agent.costUsd + authored.costUsd} incl. authoring) | hand → ${hand.outcome} @ ${hand.iterations} ($${hand.costUsd})`);
}

// ---- machinery assertions (each can fail) ----
const handGreens = rows.filter((r) => r.hand.outcome === 'green').length;
assert.ok(handGreens >= 2, `cohort must be easy: hand arm greened ${handGreens}/3 — probe INVALID, redesign tasks`);

// ---- the measurement (reported either way) ----
const agentGreens = rows.filter((r) => r.agent.outcome === 'green').length;
const validCount = rows.filter((r) => r.authored.valid).length;
console.log('\n—— M4 readout ——');
console.log(`authorship validity (first shot): ${validCount}/3`);
console.log(`greens: agent ${agentGreens}/3 vs hand ${handGreens}/3`);
console.log(`fit-to-pass events: 0 possible by construction (sealed workers, GOLD unseen close); gap text (test names) fed identically to both arms — counted: 0`);
for (const r of rows) {
  console.log(`  ${r.task}: agent=${r.agent.outcome}@${r.agent.iterations} hand=${r.hand.outcome}@${r.hand.iterations} authored=${r.authored.valid ? 'valid' : 'INVALID'}`);
}
console.log(agentGreens >= handGreens
  ? '\nPARITY (or better) — M4 exit criterion met on this cohort.'
  : `\nNO PARITY — agent arm trails by ${handGreens - agentGreens}. A result, not a failure to report around.`);
console.log(`evidence: ${work}`);
