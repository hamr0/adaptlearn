#!/usr/bin/env node
// M6 cohort launcher — wires src/cohort.js to the live bindings (design
// docs/plans/2026-07-09-m6-inheritance-selection-design.md, step 5).
//
//   node poc/run-m6-cohort.mjs --check   # token-free: close sanity + wiring, NO spend
//   node poc/run-m6-cohort.mjs           # THE LIVE COHORT (~$22 expected, $38 stop-rule)
//
// Shape: 8 registered generations x 2 lineages x 4 arms (fixed / ungated /
// gated-verbatim / gated-rules), M5 info-gap family, store seeded per task
// instance as FURNITURE (identical for every arm+lineage in a generation —
// design amendment 2026-07-09), inheritance through the author context only.
// The all-red tripwire pauses and asks YOU on stdin — stay reachable.
//
// Verdict mapping (ledger vocabulary): interpret green → green; escalated with
// category cap-halt → cap-halt (iterations exhausted or USD gate — "not under
// cap"); any other escalation → red carrying its category; invalid authored
// config → config-red (rowed by src/cohort.js, no worker tokens).
//
// Throwaway per house rules. Live tokens via local claude (clipipe), subscription.

import { createRequire } from 'node:module';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { LiteCtx } from 'litectx';
import { makeSpine } from '../src/spine.js';
import { interpret } from '../src/interpret.js';
import { validateConfig } from '../src/validate.js';
import { runCohort, ARMS } from '../src/cohort.js';
import { extractRules } from '../src/extract.js';
import { proposeRevision } from '../src/revise.js';
import { renderCatalog } from '../src/author.js';
import { TASKS } from './m6-tasks.mjs';

const require = createRequire(import.meta.url);
const { Loop } = require('bare-agent');
const { CLIPipeProvider } = require('bare-agent/providers');

const GENERATIONS = 8;
const LINEAGES = 2;
const BUDGET_USD = 38;
const CAP_RUNS = 4; // the F7/M5 evidence base for this family
const SEED = JSON.parse(readFileSync(new URL('../tests/fixtures/valid.json', import.meta.url), 'utf8'));

// uniform environment sentence (design amendment): describes the world, coaches nothing,
// and closes the information asymmetry against the hand arm (which has recall wired).
const ENV_NOTE = 'Environment note: this run\'s store is pre-seeded with a few short project notes; some are relevant to the task family, some are not.';

const work = mkdtempSync(join(tmpdir(), 'm6-cohort-'));
const CLI_HOME = join(work, 'cli-home');
mkdirSync(CLI_HOME, { recursive: true });

// ---- --check: close sanity + wiring, token-free, BEFORE any live spend ----
// GOLD closes must be able to pass (reference greens) AND to fail (empty
// artifact reds) — a close that cannot fail proves nothing (AGENT_RULES).
if (process.argv.includes('--check')) {
  assert.equal(TASKS.length, GENERATIONS, 'exactly one registered instance per generation');
  for (const t of TASKS) {
    const dir = join(work, `check-${t.id}`, 'src');
    mkdirSync(dir, { recursive: true });
    const suite = join(dir, `${t.id}.test.mjs`);
    writeFileSync(suite, t.suite);
    const target = join(dir, `${t.id}.mjs`);

    writeFileSync(target, t.reference);
    const env = { ...process.env };
    delete env.NODE_TEST_CONTEXT;
    const green = spawnSync('node', ['--test', suite], { env, encoding: 'utf8', timeout: 60_000 });
    assert.equal(green.status, 0, `${t.id}: reference must green its own suite\n${green.stdout}${green.stderr}`);

    writeFileSync(target, 'export {};\n');
    const red = spawnSync('node', ['--test', suite], { env, encoding: 'utf8', timeout: 60_000 });
    assert.notEqual(red.status, 0, `${t.id}: an empty artifact must red — a close that cannot fail proves nothing`);

    // the info-gap must exist: every error contract the SUITE tests is carried
    // by a note and never by the task statement
    for (const kw of ['RangeError', 'TypeError'].filter((k) => t.suite.includes(k))) {
      assert.ok(!t.task.includes(kw), `${t.id}: task statement leaks the ${kw} contract`);
      assert.ok(t.seeds.some(([, note]) => note.includes(kw)), `${t.id}: a seed note must carry the ${kw} contract`);
    }
    assert.equal(t.seeds.length, 3, `${t.id}: 2 convention notes + 1 decoy`);
    console.log(`check ${t.id}: close greens on reference, reds on empty, gap is note-carried`);
  }
  assert.ok(validateConfig(SEED).ok, 'fixed-arm seed config must be legal');
  console.log(`\nCHECK PASS — ${TASKS.length} instances registered, closes can pass AND fail, zero tokens spent.`);
  process.exit(0);
}

// ---- live bindings ----
console.log(`world: ${work}\ncohort: ${GENERATIONS} gens x ${LINEAGES} lineages x ${ARMS.length} arms, stop at $${BUDGET_USD}\n`);
const sealed = () => new CLIPipeProvider({
  command: 'claude',
  args: ['-p', '--output-format', 'json', '--disallowedTools', 'Write,Edit,NotebookEdit,Bash,WebFetch,WebSearch,Task,Glob,Grep,Read,TodoWrite'],
  parse: 'claude-json', cwd: CLI_HOME, timeout: 180_000,
});
const stripFences = (t) => t.trim().replace(/^```[a-z]*\n?/i, '').replace(/\n?```\s*$/, '');
const cohortSpine = makeSpine(join(work, 'cohort-ledger.jsonl'));

// one run under Ralph: fresh workdir, furniture-seeded store, gate-metered revisor
async function runOnce({ config, task, arm, lineage, gen }) {
  const t = TASKS[gen];
  const workdir = join(work, `g${gen}-${arm}-L${lineage}`);
  mkdirSync(join(workdir, 'src'), { recursive: true });
  const suite = join(workdir, 'src', `${t.id}.test.mjs`);
  writeFileSync(suite, t.suite);
  const lc = new LiteCtx({ root: workdir });
  for (const [id, text] of t.seeds) await lc.remember(id, text, { kind: 'fact' });

  const spineFile = join(workdir, 'spine.jsonl');
  const outcome = await interpret(config, {
    task: t.task, target: join(workdir, 'src', `${t.id}.mjs`), close: ['node', '--test', suite],
    workdir, capRuns: CAP_RUNS, emit: makeSpine(spineFile), provider: sealed(), shellCapUsd: 2,
    revisor: (o) => proposeRevision({ ...o, provider: sealed(), shellCapUsd: 2 }),
  });

  const events = readFileSync(spineFile, 'utf8').trimEnd().split('\n').map((l) => JSON.parse(l));
  const end = events.findLast((e) => e.type === 'run-end');
  const costUsd = events
    .filter((e) => ['worker-result', 'worker-plan', 'revision-accepted', 'revision-red'].includes(e.type))
    .reduce((s, e) => s + (e.costUsd ?? 0), 0);
  const revision = events.findLast((e) => e.type === 'revision-accepted');
  const escalation = events.findLast((e) => e.type === 'escalation');
  const verdict = outcome === 'green' ? 'green'
    : escalation?.category === 'cap-halt' ? 'cap-halt'
    : `red:${escalation?.category ?? outcome}`;
  console.log(`  [g${gen} ${arm} L${lineage}] ${verdict} @ ${end?.iterations ?? 0} (~$${costUsd.toFixed(3)})`);
  return { verdict, iterations: end?.iterations ?? 0, costUsd: +costUsd.toFixed(4), revisionDiff: revision?.changedPaths };
}

// authorship: catalog + env note + task (+ inherited rules / nudge for the rules arm)
async function author({ task, arm, lineage, gen, rules, example, nudgeAxis }) {
  const t = TASKS[gen];
  const parts = [renderCatalog({ shellCapUsd: 2 }), ENV_NOTE];
  if (rules) {
    parts.push(`Your harness lineage has inherited rules from previous runs on this task family:\n${JSON.stringify(rules, null, 2)}`);
    if (example) parts.push(`One config from this lineage that reached green:\n${JSON.stringify(example, null, 2)}`);
    if (nudgeAxis) parts.push(`Exploration note: of the config axes, "${nudgeAxis}" is the one this lineage has varied least recently.`);
  }
  parts.push(`The coding task your harness will run:\n${t.task}`);
  const loop = new Loop({ provider: sealed(), system: 'You emit exactly one JSON document and nothing else.' });
  const r = await loop.run([{ role: 'user', content: parts.join('\n\n') }]);
  let config = null;
  let reds;
  try {
    config = JSON.parse(stripFences(r.text ?? ''));
    ({ reds } = validateConfig(config, { shellCapUsd: 2 }));
  } catch (e) { reds = [{ code: 'parse-error', path: '$', detail: String(e.message) }]; }
  const valid = reds.length === 0;
  console.log(`  [g${gen} ${arm} L${lineage}] authored ${valid ? 'valid' : `INVALID ${JSON.stringify(reds)}`}${rules ? ' (rules-seeded)' : ''} (~$${(r.cost ?? 0).toFixed(3)})`);
  return { config: valid ? config : null, valid, reds, costUsd: r.cost ?? 0 };
}

// the all-red tripwire: decision-ready, on stdin — the runner never decides alone
async function onEscalate({ gen, task, rows }) {
  console.log(`\n!! ALL-RED GENERATION ${gen} (task ${task.id}) — no contrast, no meaning (§5b one level up).`);
  for (const r of rows) console.log(`   ${r.arm} L${r.lineage}: ${r.verdict} @ ${r.iterations}`);
  console.log('   Broken instance, or hard-but-fair? Inspect the workdirs, then decide.');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let answer;
  while (!['continue', 'exclude-and-continue', 'halt'].includes(answer)) {
    answer = (await rl.question('   decision [continue | exclude-and-continue | halt]: ')).trim();
  }
  rl.close();
  return answer;
}

// ---- run it ----
const result = await runCohort({
  tasks: TASKS.map((t) => ({ id: t.id, task: t.task })),
  seedConfig: SEED, generations: GENERATIONS, lineages: LINEAGES, budgetUsd: BUDGET_USD,
  runOnce, author,
  extractRules: ({ config, priorRules }) => extractRules({ config, priorRules, provider: sealed() }),
  onEscalate, emit: cohortSpine,
});

writeFileSync(join(work, 'cohort-result.json'), JSON.stringify(result, null, 2));

// ---- the registered read: green-rate per arm, early half vs late half ----
const readable = result.ledger.filter((r) => !result.excludedGens.includes(r.gen));
const rate = (rows) => (rows.length ? rows.filter((r) => r.verdict === 'green').length / rows.length : NaN);
console.log(`\n—— M6 cohort readout (${result.truncated ? 'TRUNCATED — reported as truncated' : 'complete'}, $${result.spentUsd.toFixed(2)} spent, excluded gens: [${result.excludedGens}]) ——`);
console.log('green-rate per arm (early gens 0-3 vs late gens 4-7; verdict is the only claim-bearing axis):');
for (const arm of ARMS) {
  const rows = readable.filter((r) => r.arm === arm);
  const early = rows.filter((r) => r.gen < 4);
  const late = rows.filter((r) => r.gen >= 4);
  const greens = rows.filter((r) => r.verdict === 'green');
  const capHalts = rows.filter((r) => r.verdict === 'cap-halt').length;
  const cost = greens.length ? (greens.reduce((s, r) => s + r.costUsd, 0) / greens.length).toFixed(3) : '—';
  console.log(`  ${arm.padEnd(15)} early ${rate(early).toFixed(2)}  late ${rate(late).toFixed(2)}  (n=${rows.length}, cap-halts ${capHalts}, mean cost-to-green $${cost} — ranks, never claims)`);
}
console.log(`\nevidence: ${work}\nThe gate-load-bearing read (gated-verbatim late vs ungated late, fixed as floor) and the`);
console.log('rules-vs-verbatim read are written up from cohort-result.json — numbers above are the raw material, not the verdict.');
