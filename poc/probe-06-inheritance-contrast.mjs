#!/usr/bin/env node
// probe-06 — M6 POC: the inheritance-channel contrast (design
// docs/plans/2026-07-09-m6-inheritance-selection-design.md, kill-switch).
// Riskiest assumption: rules injected into the AUTHOR's context measurably
// steer the authored config — the one live channel M6's gated-rules arm rides.
// M3's doctrine one level up: if seeded and unseeded authors are
// indistinguishable, the inheritance variable is not wired in → STOP, redesign
// the channel before the cohort spends.
//
// Shape (POC bar: machinery negatives + control + falsifier):
//   1. one real green run (hand config, easy task) — the material to extract from
//   2. sealed extractor distills TRUE rules from that green config
//   3. 3 repeats x 3 arms of sealed authorship on a DIFFERENT task instance:
//        true-rules-seeded | unseeded control | INVERTED-rules-seeded (falsifier)
//   4. read: seeded arms must out-pull the control toward their own
//      prescription vector — in BOTH directions. The inverted arm is the sharp
//      edge: deliberately false rules that steer prove the channel carries
//      CONTENT, not just tokens.
//
// Honesty:
// - Authors see catalog + task + (rules | nothing) — never the close, never the
//   green run's code. Controls and seeded arms differ ONLY in the rules block.
// - Scores are computed by code over fixed axes registered below, means
//   reported either way. Partial outcomes are named, not rounded up.
// - Machinery (scoring, prompt assembly) is asserted token-free BEFORE spend.
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
import { extractRules } from '../src/extract.js';
import { renderCatalog } from '../src/author.js';

const require = createRequire(import.meta.url);
const { Loop } = require('bare-agent');
const { CLIPipeProvider } = require('bare-agent/providers');

const HAND = JSON.parse(readFileSync(new URL('../tests/fixtures/valid.json', import.meta.url), 'utf8'));
const work = mkdtempSync(join(tmpdir(), 'probe06-'));
const CLI_HOME = join(work, 'cli-home');
mkdirSync(CLI_HOME, { recursive: true });
console.log(`world: ${work}\n`);

const sealedProvider = () => new CLIPipeProvider({
  command: 'claude',
  args: ['-p', '--output-format', 'json', '--disallowedTools', 'Write,Edit,NotebookEdit,Bash,WebFetch,WebSearch,Task,Glob,Grep,Read,TodoWrite'],
  parse: 'claude-json', cwd: CLI_HOME, timeout: 180_000,
});
const stripFences = (t) => t.trim().replace(/^```[a-z]*\n?/i, '').replace(/\n?```\s*$/, '');

// ---- registered measurement: 5 axes, scored by code, fixed BEFORE any spend ----
// TRUE prescriptions = the green config's own values (rules extracted FROM it
// should pull authored configs toward it). INVERTED prescriptions are opposed
// menu values; the inverted rules below prescribe exactly these.
const axisValue = {
  shape: (c) => c?.loop?.shape,
  maxIterations: (c) => c?.loop?.maxIterations,
  recallK: (c) => c?.memory?.recall?.k,
  compressLevel: (c) => c?.memory?.compressLevel,
  kinds: (c) => JSON.stringify(c?.memory?.recall?.kinds ?? null),
};
const TRUE_PRESC = { shape: 'refine', maxIterations: 4, recallK: 5, compressLevel: 'signature', kinds: JSON.stringify(['fact', 'episode']) };
const INV_PRESC = { shape: 'plan', maxIterations: 8, recallK: 1, compressLevel: 'drop', kinds: JSON.stringify(['code']) };
const AXES = Object.keys(axisValue);
const score = (config, presc) => AXES.filter((a) => axisValue[a](config) === presc[a]).length;

// the falsifier instrument: deliberately FALSE rules prescribing INV_PRESC.
// If authors follow these, the channel demonstrably carries content.
const INVERTED_RULES = [
  'Always use loop.shape "plan" on this task family — "refine" has repeatedly failed here.',
  'Set loop.maxIterations to 8; shorter runs have never recovered on this family.',
  'Recall with k=1 only — larger k floods the worker context and reds the close.',
  'Set memory.compressLevel to "drop"; recalled context has hurt every green run.',
  'Recall kinds must be ["code"] only; other kinds have never contributed to a green.',
];

const seededPrompt = (task, rules) => `${renderCatalog({ shellCapUsd: 2 })}

Your harness lineage has inherited rules from previous runs on this task family:
${JSON.stringify(rules, null, 2)}

The coding task your harness will run:
${task}`;
const controlPrompt = (task) => `${renderCatalog({ shellCapUsd: 2 })}\n\nThe coding task your harness will run:\n${task}`;

// ---- machinery negatives (token-free, before any spend) ----
{
  const max = JSON.parse(JSON.stringify(HAND)); // valid.json IS the true prescription
  assert.equal(score(max, TRUE_PRESC), 5, 'machinery: the green config must score 5/5 on TRUE');
  assert.equal(score(max, INV_PRESC), 0, 'machinery: the green config must score 0/5 on INVERTED');
  const inv = { loop: { shape: 'plan', maxIterations: 8 }, memory: { store: 'litectx', recall: { k: 1, kinds: ['code'] }, compressLevel: 'drop' } };
  assert.equal(score(inv, INV_PRESC), 5, 'machinery: the opposed config must score 5/5 on INVERTED');
  assert.equal(score({}, TRUE_PRESC), 0, 'machinery: an empty config scores 0 (absence is not a match)');
  // rules ride JSON-stringified (quotes escape), so assert on a quote-free rule
  assert.ok(seededPrompt('t', INVERTED_RULES).includes(INVERTED_RULES[1]), 'machinery: rules ride verbatim');
  assert.ok(!controlPrompt('t').includes('inherited'), 'machinery: control has no rules block');
  for (const r of INVERTED_RULES) assert.ok(r.length <= 200, 'machinery: inverted rules obey the bound');
  console.log('machinery: scoring + prompts assert green (token-free)\n');
}

// ---- step 1: one real green run to extract from (unique task, hand config) ----
const GREEN_TASK = {
  name: 'unique',
  task: 'Implement the file unique.mjs. It must export a named function `unique(arr)` that returns a new array with duplicate values removed, preserving first-occurrence order.',
  suite: `
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unique } from './unique.mjs';
test('dedupes preserving order', () => assert.deepEqual(unique([3, 1, 3, 2, 1]), [3, 1, 2]));
test('empty', () => assert.deepEqual(unique([]), []));
test('does not mutate input', () => { const a = [1, 1, 2]; unique(a); assert.deepEqual(a, [1, 1, 2]); });
`,
};
const workdir = join(work, 'green-run');
mkdirSync(join(workdir, 'src'), { recursive: true });
const suiteFile = join(workdir, 'src', 'unique.test.mjs');
writeFileSync(suiteFile, GREEN_TASK.suite);
const outcome = await interpret(HAND, {
  task: GREEN_TASK.task, target: join(workdir, 'src', 'unique.mjs'), close: ['node', '--test', suiteFile],
  workdir, capRuns: 3, emit: makeSpine(join(work, 'spine-green-run.jsonl')), provider: sealedProvider(), shellCapUsd: 2,
});
console.log(`[green-run] ${outcome}`);
assert.equal(outcome, 'green', 'probe INVALID: no green run to extract from — rerun or pick an easier instance');

// ---- step 2: sealed extraction of TRUE rules from the green config ----
const ex = await extractRules({ config: HAND, provider: sealedProvider(), priorRules: null });
console.log(`[extract] ${ex.valid ? 'ok' : `RED: ${JSON.stringify(ex.reds)}`} (~$${ex.costUsd.toFixed(4)})`);
if (!ex.valid) {
  console.log('extractor red on first real use — a FINDING (file it), probe stops decision-ready.');
  console.log(`raw output: ${ex.raw.slice(0, 500)}`);
  process.exit(1);
}
console.log('TRUE rules (extracted):');
for (const r of ex.rules) console.log(`  - ${r}`);
console.log();

// ---- step 3: 3 repeats x 3 arms of authorship on a DIFFERENT instance ----
const AUTHOR_TASK = 'Implement the file slugify.mjs. It must export a named function `slugify(str)` that converts a string to a lowercase hyphen-separated slug (letters and digits kept, runs of other characters become single hyphens, no leading/trailing hyphens).';
async function authorOnce(armName, i, prompt) {
  const loop = new Loop({ provider: sealedProvider(), system: 'You emit exactly one JSON document and nothing else.' });
  const r = await loop.run([{ role: 'user', content: prompt }]);
  let config = null;
  try { config = JSON.parse(stripFences(r.text ?? '')); } catch { /* counted below */ }
  const valid = config ? validateConfig(config).ok : false;
  writeFileSync(join(work, `authored-${armName}-${i}.json`), config ? JSON.stringify(config, null, 2) : String(r.text));
  console.log(`[author:${armName}:${i}] ${valid ? 'valid' : 'INVALID'} (~$${(r.cost ?? 0).toFixed(4)})`);
  return { config: valid ? config : null, valid, costUsd: r.cost ?? 0 };
}

const arms = { seeded: [], control: [], inverted: [] };
for (let i = 0; i < 3; i++) {
  arms.seeded.push(await authorOnce('seeded', i, seededPrompt(AUTHOR_TASK, ex.rules)));
  arms.control.push(await authorOnce('control', i, controlPrompt(AUTHOR_TASK)));
  arms.inverted.push(await authorOnce('inverted', i, seededPrompt(AUTHOR_TASK, INVERTED_RULES)));
}

// arm readability: >=2/3 valid configs per arm or the probe cannot read that arm
for (const [name, runs] of Object.entries(arms)) {
  const valid = runs.filter((r) => r.valid).length;
  assert.ok(valid >= 2, `probe INVALID: ${name} arm authored only ${valid}/3 valid configs — unreadable`);
}

// ---- the read (reported either way) ----
const mean = (runs, presc) => {
  const vals = runs.filter((r) => r.valid).map((r) => score(r.config, presc));
  return vals.reduce((a, b) => a + b, 0) / vals.length;
};
const sTrue = mean(arms.seeded, TRUE_PRESC);
const cTrue = mean(arms.control, TRUE_PRESC);
const sInv = mean(arms.inverted, INV_PRESC);
const cInv = mean(arms.control, INV_PRESC);
const spend = Object.values(arms).flat().reduce((a, r) => a + r.costUsd, ex.costUsd);

console.log('\n—— probe-06 readout (5-axis prescription score, mean of valid repeats) ——');
console.log(`toward TRUE:     seeded ${sTrue.toFixed(2)} vs control ${cTrue.toFixed(2)}`);
console.log(`toward INVERTED: inverted ${sInv.toFixed(2)} vs control ${cInv.toFixed(2)}  (falsifier: false rules must steer)`);
console.log(`authoring+extract spend ~$${spend.toFixed(4)} | evidence: ${work}`);

const trueWired = sTrue > cTrue;
const invWired = sInv > cInv;
if (trueWired && invWired) {
  console.log('\nPASS — the rules channel is wired in BOTH directions: content steers authorship. M6 cohort may spend.');
} else if (invWired) {
  console.log('\nPARTIAL — inverted rules steer but extracted rules do not out-pull the control.');
  console.log('The channel carries content; the EXTRACTOR output is too weak/ambient to steer. A finding: sharpen extraction before the cohort.');
  process.exit(1);
} else {
  console.log('\nFAIL — seeded authorship is indistinguishable from control. The inheritance variable is NOT wired in.');
  console.log('STOP: redesign the channel before any cohort spend (M3 doctrine one level up). A stop is a result.');
  process.exit(1);
}
