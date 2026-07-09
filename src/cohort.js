// M6 cohort runner — the generation loop OUTSIDE Ralph (design
// docs/plans/2026-07-09-m6-inheritance-selection-design.md). Ralph stays the
// dumb per-run shell; this module owns arm semantics, selection-as-code, the
// append-only ledger, the cumulative $-budget stop-rule, and the all-red
// tripwire (pause + escalate to a human — the runner never swaps tasks on its
// own; that would be authoring its own arbiter).
//
// Everything live is injected (runOnce / author / extractRules / onEscalate),
// so the whole loop is testable token-free with stubs. All middle-side spend —
// author, worker, revisor (inside runOnce), extractor — lands on the run's own
// cost line (PRD §7b.3): a ranking that lets authoring tokens ride free is
// corrupt. Selection is code, not judgment: gated-verbatim replaces its parent
// iff the mutant is green AND strictly cheaper (ties keep the parent —
// conservatism is free); ungated replaces unconditionally, verdict-blind.

import { createHash } from 'node:crypto';
import { AXES, pickMutation } from './mutate.js';

export const ARMS = ['fixed', 'ungated', 'gated-verbatim', 'gated-rules'];

const hash = (config) => createHash('sha256').update(JSON.stringify(config)).digest('hex').slice(0, 12);

// least-recently-used axis for the rules arm's prompt nudge — same novelty rule
// as the mechanical picker, but it is only ever a suggestion to the author
const nextNudge = (nudges) => {
  let best = AXES[0];
  let bestSeen = Infinity;
  for (const axis of AXES) {
    const seen = nudges.lastIndexOf(axis);
    if (seen < bestSeen) { best = axis; bestSeen = seen; }
    if (bestSeen === -1) break;
  }
  return best;
};

/**
 * Run the M6 cohort: `generations` x `lineages` x the four arms, one ledger row
 * per run (config-reds included — every run is in the denominator).
 *
 * @param {object} opts
 * @param {Array<{id: string, task: string}>} opts.tasks one instance per generation,
 *   registered up front — length MUST equal generations (no mid-cohort authoring)
 * @param {object} opts.seedConfig the hand config the fixed arm runs every generation
 * @param {number} opts.generations
 * @param {number} opts.lineages independent lineages per arm
 * @param {number} opts.budgetUsd cumulative stop-rule across ALL cohort spend
 * @param {(ctx: {config: object, task: object, arm: string, lineage: number, gen: number})
 *   => Promise<{verdict: 'green'|'red'|'cap-halt', iterations: number, costUsd: number}>} opts.runOnce
 * @param {(ctx: {task: object, arm: string, lineage: number, gen: number, rules?: string[],
 *   example?: object, nudgeAxis?: string})
 *   => Promise<{config: object|null, valid: boolean, reds: Array<object>, costUsd: number}>} opts.author
 * @param {(ctx: {config: object, task: object, arm: string, lineage: number, gen: number,
 *   priorRules: string[]|null}) => Promise<{rules: string[], costUsd: number}>} opts.extractRules
 * @param {(e: {gen: number, task: object, rows: Array<object>}) =>
 *   Promise<'continue'|'exclude-and-continue'|'halt'>} opts.onEscalate all-red tripwire — HITL
 * @param {(type: string, data?: object) => object} opts.emit spine emitter
 * @returns {Promise<{ledger: Array<object>, truncated: boolean, spentUsd: number, excludedGens: number[]}>}
 */
export async function runCohort({
  tasks, seedConfig, generations, lineages, budgetUsd,
  runOnce, author, extractRules, onEscalate, emit,
}) {
  if (!Array.isArray(tasks) || tasks.length !== generations) {
    throw new Error(`tasks must have exactly one instance per generation (got ${tasks?.length}, need ${generations})`);
  }

  const ledger = [];
  const excludedGens = [];
  let spentUsd = 0;

  // per-(arm, lineage) inheritance state; Ralph itself stays stateless
  const state = {};
  for (const arm of ARMS) {
    for (let l = 0; l < lineages; l++) {
      state[`${arm}:${l}`] = { parent: null, parentHash: null, parentCost: null, knobs: [], rules: null, lastGreen: null, nudges: [] };
    }
  }

  const finish = (truncated) => ({ ledger, truncated, spentUsd, excludedGens });
  const record = (row) => { ledger.push(row); emit('cohort-run', row); spentUsd += row.costUsd; };
  const overBudget = () => spentUsd >= budgetUsd;

  for (let gen = 0; gen < generations; gen++) {
    const task = tasks[gen];
    const genRows = [];

    for (const arm of ARMS) {
      for (let lineage = 0; lineage < lineages; lineage++) {
        const s = state[`${arm}:${lineage}`];
        const row = {
          arm, lineage, gen, taskId: task.id,
          configHash: null, knobMutated: null, verdict: null,
          iterations: 0, costUsd: 0, inheritedFrom: null,
        };

        // -- seed: decide this run's config per arm semantics --
        let config = null;
        if (arm === 'fixed') {
          config = seedConfig;
        } else if (arm === 'gated-rules') {
          const ctx = { task, arm, lineage, gen };
          if (s.rules && s.rules.length > 0) {
            ctx.rules = s.rules;
            ctx.example = s.lastGreen;
            ctx.nudgeAxis = nextNudge(s.nudges);
            s.nudges.push(ctx.nudgeAxis);
            row.knobMutated = ctx.nudgeAxis;
            row.inheritedFrom = 'rules';
          }
          const a = await author(ctx);
          row.costUsd += a.costUsd;
          if (!a.valid || !a.config) { row.verdict = 'config-red'; record(row); genRows.push(row); if (overBudget()) { emit('cohort-halt', { reason: 'budget', spentUsd }); return finish(true); } continue; }
          config = a.config;
        } else {
          // ungated / gated-verbatim: mechanical after a parent exists
          const parent = arm === 'ungated' ? s.parent : s.lastGreen;
          if (parent === null) {
            const a = await author({ task, arm, lineage, gen });
            row.costUsd += a.costUsd;
            if (!a.valid || !a.config) { row.verdict = 'config-red'; record(row); genRows.push(row); if (overBudget()) { emit('cohort-halt', { reason: 'budget', spentUsd }); return finish(true); } continue; }
            config = a.config;
          } else {
            const pick = pickMutation(parent, s.knobs);
            if (pick === null) {
              // red before tokens: no legal one-knob mutant of this parent
              row.verdict = 'config-red';
              row.inheritedFrom = arm === 'ungated' ? s.parentHash : hash(s.lastGreen);
              record(row); genRows.push(row);
              if (overBudget()) { emit('cohort-halt', { reason: 'budget', spentUsd }); return finish(true); }
              continue;
            }
            config = pick.mutant;
            row.knobMutated = pick.axis;
            s.knobs.push(pick.axis);
            row.inheritedFrom = arm === 'ungated' ? s.parentHash : hash(s.lastGreen);
          }
        }

        // -- run under Ralph (injected), then extract (rules arm, green only) --
        row.configHash = hash(config);
        const r = await runOnce({ config, task, arm, lineage, gen });
        row.verdict = r.verdict;
        row.iterations = r.iterations;
        row.costUsd += r.costUsd;

        if (arm === 'gated-rules' && r.verdict === 'green') {
          const ex = await extractRules({ config, task, arm, lineage, gen, priorRules: s.rules });
          row.costUsd += ex.costUsd;
          s.rules = ex.rules;
          s.lastGreen = config;
        }

        // -- selection: code, not judgment --
        if (arm === 'ungated') {
          s.parent = config; // verdict-blind, unconditional
          s.parentHash = row.configHash;
        } else if (arm === 'gated-verbatim' && r.verdict === 'green') {
          if (s.lastGreen === null || row.costUsd < s.parentCost) {
            s.lastGreen = config; // green ∧ strictly cheaper (or first green)
            s.parentCost = row.costUsd;
          }
        }

        record(row); genRows.push(row);
        if (overBudget()) { emit('cohort-halt', { reason: 'budget', spentUsd }); return finish(true); }
      }
    }

    // -- all-red tripwire: a generation with no contrast has no meaning (§5b) --
    if (!genRows.some((x) => x.verdict === 'green')) {
      emit('cohort-escalation', { gen, taskId: task.id, meaning: 'all-red generation — broken instance or hard-but-fair; a human decides' });
      const decision = await onEscalate({ gen, task, rows: genRows });
      emit('cohort-escalation-decision', { gen, decision });
      if (decision === 'halt') return finish(true);
      if (decision === 'exclude-and-continue') excludedGens.push(gen);
    }
  }

  emit('cohort-complete', { rows: ledger.length, spentUsd, excludedGens });
  return finish(false);
}
