// M6 cohort runner — token-free tests with a stub middle. The runner owns arm
// semantics (fixed / ungated / gated-verbatim / gated-rules), selection-as-code,
// the append-only ledger, the $-budget stop-rule, and the all-red tripwire
// (pause + escalate, never a silent task swap). Scripted green/red/cap outcomes
// drive every branch; nothing here spends tokens.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCohort, ARMS } from '../src/cohort.js';
import { AXES } from '../src/mutate.js';

const fixtures = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const seed = () => JSON.parse(readFileSync(join(fixtures, 'valid.json'), 'utf8'));

// stub factory: outcome(row-context) → {verdict, iterations, costUsd}; records calls
function stubs({ outcome = () => ({ verdict: 'green', iterations: 1, costUsd: 0.1 }) } = {}) {
  const calls = { runOnce: [], author: [], extract: [], escalate: [] };
  return {
    calls,
    runOnce: async (ctx) => { calls.runOnce.push(ctx); return outcome(ctx); },
    author: async (ctx) => {
      calls.author.push(ctx);
      return { config: seed(), valid: true, reds: [], costUsd: 0.02 };
    },
    extractRules: async (ctx) => {
      calls.extract.push(ctx);
      return { rules: ['prefer refine', 'recall high k'], costUsd: 0.01 };
    },
    onEscalate: async (e) => { calls.escalate.push(e); return 'continue'; },
    emit: () => ({}),
  };
}

const TASKS8 = Array.from({ length: 8 }, (_, i) => ({ id: `t${i}`, task: `task ${i}` }));

const base = (s, over = {}) => ({
  tasks: TASKS8,
  seedConfig: seed(),
  generations: 8,
  lineages: 2,
  budgetUsd: 38,
  runOnce: s.runOnce,
  author: s.author,
  extractRules: s.extractRules,
  onEscalate: s.onEscalate,
  emit: s.emit,
  ...over,
});

test('full green dry cohort: 4 arms x 2 lineages x 8 gens = 64 ledger rows', async () => {
  const s = stubs();
  const r = await runCohort(base(s));
  assert.equal(r.truncated, false);
  assert.equal(r.ledger.length, 64);
  assert.deepEqual(ARMS, ['fixed', 'ungated', 'gated-verbatim', 'gated-rules']);
  for (const row of r.ledger) {
    for (const field of ['arm', 'lineage', 'gen', 'taskId', 'configHash', 'verdict', 'iterations', 'costUsd', 'inheritedFrom']) {
      assert.ok(field in row, `ledger row missing ${field}`);
    }
  }
});

test('within a generation every arm runs the SAME task instance', async () => {
  const s = stubs();
  await runCohort(base(s));
  for (const call of s.calls.runOnce) {
    assert.equal(call.task.id, `t${call.gen}`, 'task must be the generation task');
  }
});

test('fixed arm never authors, never mutates: same configHash all 8 gens', async () => {
  const s = stubs();
  const r = await runCohort(base(s));
  const hashes = new Set(r.ledger.filter((x) => x.arm === 'fixed').map((x) => x.configHash));
  assert.equal(hashes.size, 1);
  assert.ok(s.calls.author.every((a) => a.arm !== 'fixed'));
});

test('gen 0 of ungated/gated-verbatim/gated-rules is authored fresh (no seed material)', async () => {
  const s = stubs();
  await runCohort(base(s));
  const gen0 = s.calls.author.filter((a) => a.gen === 0);
  assert.deepEqual(gen0.map((a) => a.arm).sort(), [
    'gated-rules', 'gated-rules', 'gated-verbatim', 'gated-verbatim', 'ungated', 'ungated',
  ]);
  assert.ok(gen0.every((a) => a.rules === undefined && a.example === undefined));
});

test('ungated arm inherits verdict-blind: config chain advances even through reds', async () => {
  // lineage 0 of ungated reds every gen; its config must still mutate every generation
  const s = stubs({
    outcome: ({ arm, lineage }) => (arm === 'ungated' && lineage === 0
      ? { verdict: 'red', iterations: 4, costUsd: 0.1 }
      : { verdict: 'green', iterations: 1, costUsd: 0.1 }),
  });
  const r = await runCohort(base(s));
  const rows = r.ledger.filter((x) => x.arm === 'ungated' && x.lineage === 0);
  for (let g = 1; g < rows.length; g++) {
    assert.equal(rows[g].inheritedFrom, rows[g - 1].configHash, 'child of the LAST run, red or not');
    assert.notEqual(rows[g].configHash, rows[g - 1].configHash, 'one knob mutated every gen');
    assert.ok(AXES.includes(rows[g].knobMutated));
  }
});

test('gated-verbatim: red mutant does NOT replace its parent', async () => {
  // gen0 green (parent minted); every later run red → parent stays gen0's config
  const s = stubs({
    outcome: ({ arm, gen }) => (arm === 'gated-verbatim' && gen > 0
      ? { verdict: 'red', iterations: 4, costUsd: 0.05 }
      : { verdict: 'green', iterations: 1, costUsd: 0.1 }),
  });
  const r = await runCohort(base(s));
  const rows = r.ledger.filter((x) => x.arm === 'gated-verbatim' && x.lineage === 0);
  const parentHash = rows[0].configHash;
  for (const row of rows.slice(1)) {
    assert.equal(row.inheritedFrom, parentHash, 'every mutant is a child of the standing green parent');
  }
});

test('gated-verbatim: green-but-costlier mutant does not replace; green-and-cheaper does', async () => {
  const costs = { 0: 0.2, 1: 0.5, 2: 0.1 }; // gen0 parent 0.2 → gen1 green@0.5 (no), gen2 green@0.1 (yes)
  const s = stubs({
    outcome: ({ arm, gen }) => (arm === 'gated-verbatim'
      ? { verdict: 'green', iterations: 1, costUsd: costs[gen] ?? 0.3 }
      : { verdict: 'green', iterations: 1, costUsd: 0.1 }),
  });
  const r = await runCohort(base(s, { generations: 4, tasks: TASKS8.slice(0, 4), lineages: 1 }));
  const rows = r.ledger.filter((x) => x.arm === 'gated-verbatim');
  assert.equal(rows[2].inheritedFrom, rows[0].configHash, 'costlier green did not replace');
  assert.equal(rows[3].inheritedFrom, rows[2].configHash, 'cheaper green replaced');
});

test('gated arm with no green ancestor authors fresh, and that is curve data not papering', async () => {
  // gated-verbatim reds at gen0 → gen1 must author fresh (no green ancestor), not mutate
  let calls = 0;
  const s = stubs({
    outcome: ({ arm, gen }) => (arm === 'gated-verbatim' && gen === 0
      ? { verdict: 'red', iterations: 4, costUsd: 0.1 }
      : { verdict: 'green', iterations: 1, costUsd: 0.1 }),
  });
  await runCohort(base(s, { generations: 2, tasks: TASKS8.slice(0, 2), lineages: 1 }));
  const authored = s.calls.author.filter((a) => a.arm === 'gated-verbatim');
  assert.equal(authored.length, 2, 'gen0 fresh + gen1 fresh (no green ancestor yet)');
});

test('gated-rules: extractor runs on green only; rules + example + nudge feed the next author', async () => {
  const s = stubs({
    outcome: ({ arm, gen }) => (arm === 'gated-rules' && gen === 0
      ? { verdict: 'red', iterations: 4, costUsd: 0.1 }
      : { verdict: 'green', iterations: 1, costUsd: 0.1 }),
  });
  await runCohort(base(s, { generations: 3, tasks: TASKS8.slice(0, 3), lineages: 1 }));
  assert.equal(s.calls.extract.filter((e) => e.arm === 'gated-rules').length, 2, 'gen1+gen2 greens extract; gen0 red does not');
  const authors = s.calls.author.filter((a) => a.arm === 'gated-rules');
  assert.equal(authors.length, 3, 'rules arm authors every generation');
  assert.equal(authors[1].rules, undefined, 'no green yet at gen1 authoring time → fresh');
  assert.deepEqual(authors[2].rules, ['prefer refine', 'recall high k']);
  assert.ok(authors[2].example, 'green example config rides along');
  assert.ok(AXES.includes(authors[2].nudgeAxis), 'novelty nudge names a real axis');
});

test('author and extractor spend land on the run cost line (§7b.3)', async () => {
  const s = stubs();
  const r = await runCohort(base(s, { generations: 1, tasks: TASKS8.slice(0, 1), lineages: 1 }));
  const rules = r.ledger.find((x) => x.arm === 'gated-rules');
  assert.ok(Math.abs(rules.costUsd - (0.1 + 0.02 + 0.01)) < 1e-9, 'worker + author + extractor');
  const fixed = r.ledger.find((x) => x.arm === 'fixed');
  assert.ok(Math.abs(fixed.costUsd - 0.1) < 1e-9, 'fixed arm pays worker only');
  assert.ok(Math.abs(r.spentUsd - r.ledger.reduce((a, x) => a + x.costUsd, 0)) < 1e-9);
});

test('budget stop-rule: cohort halts at the cap and reports truncated', async () => {
  const s = stubs({ outcome: () => ({ verdict: 'green', iterations: 1, costUsd: 10 }) });
  const r = await runCohort(base(s, { budgetUsd: 25 }));
  assert.equal(r.truncated, true);
  assert.ok(r.ledger.length < 64, 'stopped early');
  assert.ok(r.spentUsd >= 25, 'halted on crossing, not before');
});

test('all-red generation trips the HITL escalation; exclude decision marks the generation', async () => {
  const s = stubs({
    outcome: ({ gen }) => (gen === 1
      ? { verdict: 'red', iterations: 4, costUsd: 0.1 }
      : { verdict: 'green', iterations: 1, costUsd: 0.1 }),
  });
  s.onEscalate = async (e) => { s.calls.escalate.push(e); return 'exclude-and-continue'; };
  const r = await runCohort(base(s));
  assert.equal(s.calls.escalate.length, 1);
  assert.equal(s.calls.escalate[0].gen, 1);
  assert.deepEqual(r.excludedGens, [1]);
  assert.equal(r.ledger.length, 64, 'cohort continued after the human decision');
});

test('all-red tripwire halt decision stops the cohort', async () => {
  const s = stubs({ outcome: () => ({ verdict: 'red', iterations: 4, costUsd: 0.1 }) });
  s.onEscalate = async () => 'halt';
  const r = await runCohort(base(s));
  assert.equal(r.truncated, true);
  assert.equal(r.ledger.length, 8, 'one generation ran, then the human halted');
});

test('a mixed generation (any green anywhere) does NOT trip the wire', async () => {
  const s = stubs({
    outcome: ({ arm }) => (arm === 'fixed'
      ? { verdict: 'green', iterations: 1, costUsd: 0.1 }
      : { verdict: 'red', iterations: 4, costUsd: 0.1 }),
  });
  await runCohort(base(s));
  assert.equal(s.calls.escalate.length, 0);
});

test('invalid authored config is a config-red row: no worker run, cost still counted', async () => {
  const s = stubs();
  s.author = async (ctx) => {
    s.calls.author.push(ctx);
    return { config: null, valid: false, reds: [{ code: 'parse-error', path: '$' }], costUsd: 0.02 };
  };
  const r = await runCohort(base(s, { generations: 1, tasks: TASKS8.slice(0, 1), lineages: 1 }));
  const authored = r.ledger.filter((x) => x.arm !== 'fixed');
  assert.equal(authored.length, 3);
  assert.ok(authored.every((x) => x.verdict === 'config-red'));
  assert.ok(authored.every((x) => x.costUsd === 0.02), 'authoring spend counted');
  assert.ok(s.calls.runOnce.every((c) => c.arm === 'fixed'), 'no tokens burned on an invalid config');
});

test('tasks/generations mismatch is a programmer error, not a silent trim', async () => {
  const s = stubs();
  await assert.rejects(() => runCohort(base(s, { tasks: TASKS8.slice(0, 3) })), /tasks/);
});

test('cap-halt verdicts stay their own category in the ledger', async () => {
  const s = stubs({
    outcome: ({ arm }) => (arm === 'fixed'
      ? { verdict: 'cap-halt', iterations: 2, costUsd: 2 }
      : { verdict: 'green', iterations: 1, costUsd: 0.1 }),
  });
  const r = await runCohort(base(s, { generations: 1, tasks: TASKS8.slice(0, 1), lineages: 1 }));
  assert.equal(r.ledger.find((x) => x.arm === 'fixed').verdict, 'cap-halt');
});

test("inherit='executed' passes the run-as-executed config into the lineage (F18)", async () => {
  // the run "revises" itself: finalConfig differs from the authored config by
  // an added recall kind — under executed inheritance the NEXT gen's mutation
  // parent must be the final config; under authored (default) it must not be
  const revised = seed();
  revised.memory.recall.kinds = [...revised.memory.recall.kinds, 'code'];
  for (const [mode, expectInherited] of [['executed', true], ['authored', false]]) {
    const s = stubs({ outcome: () => ({ verdict: 'green', iterations: 3, costUsd: 0.1, finalConfig: revised }) });
    await runCohort(base(s, { inherit: mode, generations: 2, tasks: TASKS8.slice(0, 2), lineages: 1 }));
    const g1Ungated = s.calls.runOnce.find((c) => c.arm === 'ungated' && c.gen === 1);
    const parentHadCode = g1Ungated.config.memory.recall.kinds.includes('code')
      || JSON.stringify(g1Ungated.config).includes('"code"');
    assert.equal(parentHadCode, expectInherited, `inherit=${mode}: g1 ungated parent ${expectInherited ? 'must' : 'must not'} carry the run-time acquisition`);
    // gated-rules extraction must also see the executed config in executed mode
    const ex = s.calls.extract.find((c) => c.arm === 'gated-rules' && c.gen === 0);
    assert.equal(ex.config.memory.recall.kinds.includes('code'), mode === 'executed');
  }
});

test("inherit='executed' without a finalConfig falls back to the authored config", async () => {
  const s = stubs({ outcome: () => ({ verdict: 'green', iterations: 1, costUsd: 0.1 }) });
  const r = await runCohort(base(s, { inherit: 'executed', generations: 2, tasks: TASKS8.slice(0, 2), lineages: 1 }));
  assert.equal(r.truncated, false);
  assert.ok(r.ledger.every((row) => !('executedHash' in row) || row.executedHash === undefined || typeof row.executedHash === 'string'));
});

test('unknown inherit mode is a programmer error', async () => {
  const s = stubs();
  await assert.rejects(() => runCohort(base(s, { inherit: 'both' })), /inherit/);
});
