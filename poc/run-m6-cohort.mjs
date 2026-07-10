#!/usr/bin/env node
// M6 cohort launcher, attempt 2 — wires src/cohort.js to the live bindings
// (design docs/plans/2026-07-09-m6-inheritance-selection-design.md, step 5;
// F13 hardening + difficulty redesign).
//
//   node poc/run-m6-cohort.mjs --check           # token-free: close sanity + wiring, NO spend
//   node poc/run-m6-cohort.mjs                   # THE LIVE COHORT (expected low-$20s, $38 stop)
//   node poc/run-m6-cohort.mjs --resume <world>  # continue a killed SAME-CONDITION run:
//                                                #   completed rows replay from the merged
//                                                #   ledgers (hash-verified), only missing
//                                                #   rows spend tokens
//
// Attempt-2 condition (F13, pre-registered): house-convention notes are seeded
// as litectx kind "episode"; decoys stay "fact". The interpreter's recall
// default is ['fact'], so a config that omits kinds never surfaces the
// conventions regardless of k — "where knowledge lives" is the environment
// regularity lineages must discover and transmit. capRuns 3 (was 4) narrows
// gap-fed self-recovery. valid.json stays the fixed arm unchanged (predates
// the trick; a strong floor, read as context — C-vs-B decides the gate claim).
//
// Attempt-3 condition (F14 door b, pre-registered in F15 / PRD §7c, §4b-declared):
// the close is OPAQUE — m6-opaque-close.mjs reports pass/fail counts only, never
// test names or assertion text, so the gap channel can no longer teach the
// conventions the store carries. Everything else is attempt-2 verbatim.
// Registered prediction: no-episode configs stay red; the verdict axis regains
// dynamic range; gated-vs-ungated gets its first uncontaminated read.
//
// F13 outage rules (§5b: broken middle → escalate, never mint rows):
// - a provider throw during authoring/extraction is contained and PROMPTS
//   (retry / record / halt) instead of crashing the process;
// - a $0 interpreter-red run (the outage signature — real harness reds burn
//   tokens) PROMPTS before its row is written;
// - configs, rules, and results are persisted per row so nothing is lost.
//
// The all-red tripwire pauses and asks YOU on stdin — stay reachable.
// Throwaway per house rules. Live tokens via local claude (clipipe), subscription.

import { createRequire } from 'node:module';
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { LiteCtx } from 'litectx';
import { makeSpine } from '../src/spine.js';
import { interpret } from '../src/interpret.js';
import { validateConfig } from '../src/validate.js';
import { runCohort, ARMS } from '../src/cohort.js';
import { extractRules } from '../src/extract.js';
import { proposeRevision } from '../src/revise.js';
import { renderCatalog } from '../src/author.js';
// SP-3 (F17): --task-set sp3 swaps in the idiosyncratic-conventions instances
// (guessability probe); default stays the registered m6 set. Stamped into the
// world's condition.json; resume refuses a mismatch.
const tsAt = process.argv.indexOf('--task-set');
const TASK_SET = tsAt !== -1 ? process.argv[tsAt + 1] : 'm6';
assert.ok(['m6', 'sp3'].includes(TASK_SET), `unknown task set: ${TASK_SET}`);
const { TASKS } = await import(TASK_SET === 'sp3' ? './sp3-tasks.mjs' : './m6-tasks.mjs');
// F19 (attempt 4): --no-revision removes M5 from every arm — cross-run search
// (mutation / rules-seeded authorship) becomes the ONLY discovery path, so the
// verdict axis can finally carry the gated-vs-ungated claim (F18: in-run
// acquisition was the masker in every prior cohort).
const NO_REVISION = process.argv.includes('--no-revision');
// F20 (successor POC #1): --inherit executed passes the run-as-executed config
// (post-revision) into the lineage; default 'authored' is the original semantics.
const inhAt = process.argv.indexOf('--inherit');
const INHERIT = inhAt !== -1 ? process.argv[inhAt + 1] : 'authored';
assert.ok(['authored', 'executed'].includes(INHERIT), `unknown inherit mode: ${INHERIT}`);

const require = createRequire(import.meta.url);
const { Loop, HaltError } = require('bare-agent');
const { CLIPipeProvider } = require('bare-agent/providers');

const GENERATIONS = 8;
const LINEAGES = 2;
const BUDGET_USD = 38;
const CAP_RUNS = 3; // F13 attempt-2: tightened from the F7 base of 4
const SEED = JSON.parse(readFileSync(new URL('../tests/fixtures/valid.json', import.meta.url), 'utf8'));
const ENV_NOTE = 'Environment note: this run\'s store is pre-seeded with a few short project notes; some are relevant to the task family, some are not.';
// attempt-3: the one condition change — the close argv the interpreter hands Ralph
const OPAQUE_CLOSE = new URL('./m6-opaque-close.mjs', import.meta.url).pathname;
const closeArgv = (suite) => ['node', OPAQUE_CLOSE, suite];

const hash = (config) => createHash('sha256').update(JSON.stringify(config)).digest('hex').slice(0, 12);
const stripFences = (t) => t.trim().replace(/^```[a-z]*\n?/i, '').replace(/\n?```\s*$/, '');
const key = ({ gen, arm, lineage }) => `g${gen}-${arm}-L${lineage}`;

// ---- --check: close sanity + wiring, token-free, BEFORE any live spend ----
if (process.argv.includes('--check')) {
  const world = mkdtempSync(join(tmpdir(), 'm6-check-'));
  assert.equal(TASKS.length, GENERATIONS, 'exactly one registered instance per generation');
  for (const t of TASKS) {
    const dir = join(world, `check-${t.id}`, 'src');
    mkdirSync(dir, { recursive: true });
    const suite = join(dir, `${t.id}.test.mjs`);
    writeFileSync(suite, t.suite);
    const target = join(dir, `${t.id}.mjs`);

    writeFileSync(target, t.reference);
    const env = { ...process.env };
    delete env.NODE_TEST_CONTEXT;
    const [cmd, ...cargs] = closeArgv(suite);
    const green = spawnSync(cmd, cargs, { env, encoding: 'utf8', timeout: 120_000 });
    assert.equal(green.status, 0, `${t.id}: reference must green its own suite\n${green.stdout}${green.stderr}`);

    writeFileSync(target, 'export {};\n');
    const red = spawnSync(cmd, cargs, { env, encoding: 'utf8', timeout: 120_000 });
    assert.notEqual(red.status, 0, `${t.id}: an empty artifact must red — a close that cannot fail proves nothing`);

    // attempt-3: the close must be OPAQUE — counts only, nothing the gap channel can teach from.
    // The whole red-path output (what Ralph feeds back as gap) must be the single counts line.
    const gapText = (red.stderr || red.stdout || '').trim();
    assert.match(gapText, /^close: \d+ of \d+ tests failing$/,
      `${t.id}: opaque close leaked beyond counts:\n${gapText}`);

    for (const kw of ['RangeError', 'TypeError'].filter((k) => t.suite.includes(k))) {
      assert.ok(!t.task.includes(kw), `${t.id}: task statement leaks the ${kw} contract`);
      assert.ok(t.seeds.some(([, note]) => note.includes(kw)), `${t.id}: a seed note must carry the ${kw} contract`);
    }
    assert.equal(t.seeds.length, 3, `${t.id}: 2 convention notes + 1 decoy`);
    // F13 attempt-2 condition: conventions live in 'episode', decoys in 'fact'
    for (const [id, , kind] of t.seeds) {
      assert.equal(kind, id.includes('decoy') ? 'fact' : 'episode', `${t.id}/${id}: wrong seed kind for the attempt-2 condition`);
    }
    console.log(`check ${t.id}: close greens on reference, reds on empty, gap is note-carried in 'episode'`);
  }
  assert.ok(validateConfig(SEED).ok, 'fixed-arm seed config must be legal');
  console.log(`\nCHECK PASS — ${TASKS.length} instances registered, closes can pass AND fail, zero tokens spent.`);
  process.exit(0);
}

// ---- world + resume cache ----
const resumeAt = process.argv.indexOf('--resume');
const work = resumeAt !== -1 ? process.argv[resumeAt + 1] : mkdtempSync(join(tmpdir(), 'm6-cohort-'));
assert.ok(work && existsSync(work), `world dir missing: ${work}`);
const CLI_HOME = join(work, 'cli-home');
for (const d of ['cli-home', 'configs', 'configs-final', 'rules']) mkdirSync(join(work, d), { recursive: true });

// merged prior ledgers, last row per (gen,arm,lineage) wins; outage rows never replay
const cache = new Map();
if (resumeAt !== -1) {
  for (const f of readdirSync(work).filter((n) => n.startsWith('cohort-ledger') && n.endsWith('.jsonl'))) {
    for (const line of readFileSync(join(work, f), 'utf8').trim().split('\n').filter(Boolean)) {
      const r = JSON.parse(line);
      if (r.type !== 'cohort-run') continue;
      if (r.verdict?.startsWith('red:interpreter-red')) continue; // outage rows re-run live
      cache.set(key(r), r);
    }
  }
  console.log(`resume: replaying ${cache.size} completed rows from ${work}`);
}
const cohortSpine = makeSpine(join(work, `cohort-ledger-${process.pid}.jsonl`));
console.log(`world: ${work}\ncohort: ${GENERATIONS} gens x ${LINEAGES} lineages x ${ARMS.length} arms, capRuns ${CAP_RUNS}, stop at $${BUDGET_USD}\n`);

// ---- HITL prompt (shared by outage guard and the all-red tripwire) ----
async function promptChoice(question, options) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let answer;
  while (!options.includes(answer)) answer = (await rl.question(`${question} [${options.join(' | ')}]: `)).trim();
  rl.close();
  return answer;
}

// SP-1 (F16): --worker-model <id> pins the WORKER's model only — author, extractor, and
// revisor stay on the CLI default. One knob: guessing ability varies, authoring competence
// held. The condition is stamped into the world; resume refuses a mismatch.
const wmAt = process.argv.indexOf('--worker-model');
const WORKER_MODEL = wmAt !== -1 ? process.argv[wmAt + 1] : null;
const condFile = join(work, 'condition.json');
if (existsSync(condFile)) {
  const prior = JSON.parse(readFileSync(condFile, 'utf8'));
  assert.equal(prior.workerModel ?? null, WORKER_MODEL, `condition mismatch: world ran workerModel=${prior.workerModel}, flag says ${WORKER_MODEL} — same-condition resume only`);
  assert.equal(prior.taskSet ?? 'm6', TASK_SET, `condition mismatch: world ran taskSet=${prior.taskSet ?? 'm6'}, flag says ${TASK_SET} — same-condition resume only`);
  assert.equal(prior.revision ?? 'on', NO_REVISION ? 'off' : 'on', `condition mismatch: world ran revision=${prior.revision ?? 'on'} — same-condition resume only`);
  assert.equal(prior.inherit ?? 'authored', INHERIT, `condition mismatch: world ran inherit=${prior.inherit ?? 'authored'} — same-condition resume only`);
} else {
  writeFileSync(condFile, JSON.stringify({ workerModel: WORKER_MODEL, taskSet: TASK_SET, revision: NO_REVISION ? 'off' : 'on', inherit: INHERIT }, null, 2));
}
if (WORKER_MODEL || TASK_SET !== 'm6' || NO_REVISION || INHERIT !== 'authored') console.log(`condition: worker model ${WORKER_MODEL ?? 'CLI default'} (author/extract/revisor on CLI default), task set ${TASK_SET}, revision ${NO_REVISION ? 'OFF' : 'on'}, inherit ${INHERIT}\n`);

const sealed = (model = null) => new CLIPipeProvider({
  command: 'claude',
  args: ['-p', '--output-format', 'json', ...(model ? ['--model', model] : []), '--disallowedTools', 'Write,Edit,NotebookEdit,Bash,WebFetch,WebSearch,Task,Glob,Grep,Read,TodoWrite'],
  parse: 'claude-json', cwd: CLI_HOME, timeout: 180_000,
});

// hang watchdog: a sealed call whose promise never settles (observed live —
// g3-ungated-L1 revisor call, CLI child gone, 180s clipipe timeout never fired)
// defeats try/catch; a race converts the hang into a throw that guarded() can
// escalate. The leaked promise is abandoned — acceptable in a throwaway.
const withTimeout = (promise, ms, label) => Promise.race([
  promise,
  new Promise((_, reject) => {
    const t = setTimeout(() => reject(new Error(`watchdog: ${label} unsettled after ${ms / 60000}min`)), ms);
    t.unref();
  }),
]);

// F13 gap 1: a provider throw is a §5b broken-middle — escalate to the operator,
// never crash, never mint a row while the middle is down.
async function guarded(label, fn) {
  for (;;) {
    try { return await fn(); } catch (e) {
      console.log(`\n!! provider/middle failure during ${label}: ${String(e.message ?? e).slice(0, 300)}`);
      console.log('   §5b: broken middle — no verdict is trustworthy. Restore the provider (limits?), then choose.');
      const a = await promptChoice('   decision', ['retry', 'halt']);
      if (a === 'halt') throw e;
    }
  }
}

// ---- one run under Ralph: furniture-seeded store, gate-metered revisor ----
async function runOnce(ctx) {
  const { config, arm, lineage, gen } = ctx;
  const cached = cache.get(key(ctx));
  if (cached) {
    assert.equal(hash(config), cached.configHash, `resume drift at ${key(ctx)}: recomputed config differs from the ledger — same-condition resume only`);
    console.log(`  [${key(ctx)}] replay ${cached.verdict} @ ${cached.iterations} ($${cached.costUsd.toFixed(3)})`);
    // executed-inheritance replay: the run-as-executed config was persisted at
    // run time; without it a resumed lineage would silently fall back to the
    // authored config and fork history
    const finalSaved = join(work, 'configs-final', `${key(ctx)}.json`);
    const finalConfig = existsSync(finalSaved) ? JSON.parse(readFileSync(finalSaved, 'utf8')) : null;
    return { verdict: cached.verdict, iterations: cached.iterations, costUsd: cached.costUsd, finalConfig };
  }
  writeFileSync(join(work, 'configs', `${key(ctx)}.json`), JSON.stringify(config, null, 2));
  const t = TASKS[gen];

  for (let attempt = 0; ; attempt++) {
    const workdir = join(work, `${key(ctx)}${attempt ? `-r${attempt}` : ''}`);
    mkdirSync(join(workdir, 'src'), { recursive: true });
    const suite = join(workdir, 'src', `${t.id}.test.mjs`);
    writeFileSync(suite, t.suite);
    const lc = new LiteCtx({ root: workdir });
    for (const [id, text, kind] of t.seeds) await lc.remember(id, text, { kind });

    const spineFile = join(workdir, 'spine.jsonl');
    // 30min covers the worst legit run (3 iterations x plan's 2 calls x 180s + a revision)
    const outcome = await guarded(`run ${key(ctx)}`, () => withTimeout(interpret(config, {
      task: t.task, target: join(workdir, 'src', `${t.id}.mjs`), close: closeArgv(suite),
      workdir, capRuns: CAP_RUNS, emit: makeSpine(spineFile), provider: sealed(WORKER_MODEL), shellCapUsd: 2,
      // a hung/failed revisor becomes a revision-red (run continues on the old
      // config), never an interpreter-red the harness didn't earn — but a gate
      // HaltError still propagates as the cap-halt it is (F11 / §7b.3).
      // F19: --no-revision omits the revisor entirely — no M5, no in-run
      // acquisition; cross-run search is the only discovery path.
      revisor: NO_REVISION ? null : (o) => withTimeout(proposeRevision({ ...o, provider: sealed(), shellCapUsd: 2 }), 5 * 60_000, `revisor ${key(ctx)}`)
        .catch((e) => {
          if (e instanceof HaltError) throw e;
          return { candidate: null, parseError: String(e.message ?? e), costUsd: 0 };
        }),
    }), 30 * 60_000, `run ${key(ctx)}`));

    const events = readFileSync(spineFile, 'utf8').trimEnd().split('\n').map((l) => JSON.parse(l));
    const end = events.findLast((e) => e.type === 'run-end');
    const costUsd = events
      .filter((e) => ['worker-result', 'worker-plan', 'revision-accepted', 'revision-red'].includes(e.type))
      .reduce((s, e) => s + (e.costUsd ?? 0), 0);
    const escalation = events.findLast((e) => e.type === 'escalation');
    const verdict = outcome === 'green' ? 'green'
      : escalation?.category === 'cap-halt' ? 'cap-halt'
      : `red:${escalation?.category ?? outcome}`;

    // F13 gap 1b: the outage signature — an interpreter-red that burned $0.
    // Real harness reds cost tokens; a free red means the middle never answered.
    if (verdict === 'red:interpreter-red' && costUsd === 0) {
      console.log(`\n!! ${key(ctx)}: interpreter-red at $0 — outage signature (${escalation?.detail?.slice(0, 200) ?? 'no detail'})`);
      const a = await promptChoice('   decision', ['retry', 'record', 'halt']);
      if (a === 'retry') continue;
      if (a === 'halt') throw new Error('operator halt on outage');
    }
    const revision = events.findLast((e) => e.type === 'revision-accepted');
    // F18: persist the run-as-executed config so inherit=executed survives resume
    const configFinal = events.findLast((e) => e.type === 'config-final')?.config ?? null;
    if (configFinal) writeFileSync(join(work, 'configs-final', `${key(ctx)}.json`), JSON.stringify(configFinal, null, 2));
    console.log(`  [${key(ctx)}] ${verdict} @ ${end?.iterations ?? 0} (~$${costUsd.toFixed(3)})`);
    return { verdict, iterations: end?.iterations ?? 0, costUsd: +costUsd.toFixed(4), revisionDiff: revision?.changedPaths, finalConfig: configFinal };
  }
}

// ---- authorship: catalog + env note + task (+ rules / nudge for the rules arm) ----
async function author(ctx) {
  const { arm, lineage, gen, rules, example, nudgeAxis } = ctx;
  const cached = cache.get(key(ctx));
  const saved = join(work, 'configs', `${key(ctx)}.json`);
  if (cached?.verdict === 'config-red') {
    // replay the config-red as-is: re-authoring live could come out valid and
    // fork this lineage's history away from the ledger (hash aborts downstream)
    return { config: null, valid: false, reds: [{ code: 'replay-config-red' }], costUsd: cached.costUsd };
  }
  if (cached && existsSync(saved)) {
    // replay: cost 0 here — the row's full cost returns through runOnce's replay
    return { config: JSON.parse(readFileSync(saved, 'utf8')), valid: true, reds: [], costUsd: 0 };
  }
  const t = TASKS[gen];
  const parts = [renderCatalog({ shellCapUsd: 2 }), ENV_NOTE];
  if (rules) {
    parts.push(`Your harness lineage has inherited rules from previous runs on this task family:\n${JSON.stringify(rules, null, 2)}`);
    if (example) parts.push(`One config from this lineage that reached green:\n${JSON.stringify(example, null, 2)}`);
    if (nudgeAxis) parts.push(`Exploration note: of the config axes, "${nudgeAxis}" is the one this lineage has varied least recently.`);
  }
  parts.push(`The coding task your harness will run:\n${t.task}`);

  // F13 gap 2: an authoring outage is contained — guarded prompt, never a crash
  const r = await guarded(`author ${key(ctx)}`, () => {
    const loop = new Loop({ provider: sealed(), system: 'You emit exactly one JSON document and nothing else.' });
    return withTimeout(loop.run([{ role: 'user', content: parts.join('\n\n') }]), 5 * 60_000, `author ${key(ctx)}`);
  });
  let config = null;
  let reds;
  try {
    config = JSON.parse(stripFences(r.text ?? ''));
    ({ reds } = validateConfig(config, { shellCapUsd: 2 }));
  } catch (e) { reds = [{ code: 'parse-error', path: '$', detail: String(e.message) }]; }
  const valid = reds.length === 0;
  console.log(`  [${key(ctx)}] authored ${valid ? 'valid' : `INVALID ${JSON.stringify(reds)}`}${rules ? ' (rules-seeded)' : ''} (~$${(r.cost ?? 0).toFixed(3)})`);
  return { config: valid ? config : null, valid, reds, costUsd: r.cost ?? 0 };
}

// ---- extraction: persisted per lineage-generation for resume ----
async function extract(ctx) {
  const saved = join(work, 'rules', `${key(ctx)}.json`);
  if (cache.get(key(ctx)) && existsSync(saved)) return { rules: JSON.parse(readFileSync(saved, 'utf8')), costUsd: 0 };
  const r = await guarded(`extract ${key(ctx)}`, () => withTimeout(
    extractRules({ config: ctx.config, priorRules: ctx.priorRules, provider: sealed() }),
    5 * 60_000, `extract ${key(ctx)}`,
  ));
  if (!r.valid) {
    console.log(`  [${key(ctx)}] extractor RED ${JSON.stringify(r.reds)} — lineage keeps its prior rules`);
    return { rules: ctx.priorRules ?? [], costUsd: r.costUsd };
  }
  writeFileSync(saved, JSON.stringify(r.rules, null, 2));
  return { rules: r.rules, costUsd: r.costUsd };
}

// ---- the all-red tripwire: decision-ready, on stdin ----
async function onEscalate({ gen, task, rows }) {
  console.log(`\n!! ALL-RED GENERATION ${gen} (task ${task.id}) — no contrast, no meaning (§5b one level up).`);
  for (const r of rows) console.log(`   ${r.arm} L${r.lineage}: ${r.verdict} @ ${r.iterations}`);
  console.log('   Broken instance, or hard-but-fair? Inspect the workdirs, then decide.');
  return promptChoice('   decision', ['continue', 'exclude-and-continue', 'halt']);
}

// ---- run it ----
const result = await runCohort({
  tasks: TASKS.map((t) => ({ id: t.id, task: t.task })),
  seedConfig: SEED, generations: GENERATIONS, lineages: LINEAGES, budgetUsd: BUDGET_USD,
  runOnce, author, extractRules: extract, onEscalate, emit: cohortSpine,
  inherit: INHERIT,
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
console.log(`\nevidence: ${work}\ncohort-result.json written. The gate-load-bearing read (gated-verbatim late vs ungated late, fixed as floor)`);
console.log('and the rules-vs-verbatim read are written up from it — numbers above are raw material, not the verdict.');
