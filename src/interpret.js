// The interpreter — the ONLY code that reads a harness config (design
// docs/plans/2026-07-08-schema-v1-design.md). It composes the three libs, never
// invents: litectx is the store, bareguard is the leash, bareagent is the worker
// loop. The provider arrives from the SHELL (never the config — arbiter-adjacent),
// and the close never runs here: ralph runs it and feeds the verdict back as `gap`.
//
// Graduated from poc/probe-02 (which caught two real traps now encoded here:
// onLlmResult is a Loop CONSTRUCTOR option — on run() it is silently ignored and
// the budget axis goes blind; and a budget-exhausted gate deny must surface as
// cap-halt, not as a generic error).

import { createRequire } from 'node:module';
import { writeFileSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Gate } from 'bareguard';
import { LiteCtx, compress } from 'litectx';
import { validateConfig } from './validate.js';
import { ralph } from './ralph.js';

const require = createRequire(import.meta.url);
const { Loop, wireGate, HaltError } = require('bare-agent');

const PERSONA = 'You are a senior engineer. Reply with ONLY the complete contents of the requested JavaScript file — no markdown fences, no commentary. ESM.';
const stripFences = (t) => t.trim().replace(/^```[a-z]*\n?/i, '').replace(/\n?```\s*$/, '');

/**
 * Execute a harness config against one task under the dumb shell.
 *
 * @param {object|string} configRaw schema v1 config (object or raw JSON text)
 * @param {object} opts
 * @param {string} opts.task implement instruction shown to the worker
 * @param {string} opts.target absolute path the artifact is written to
 * @param {string[]} opts.close argv whose exit code is truth (shell-owned)
 * @param {string} opts.workdir run directory (litectx root, gate audit, scope base)
 * @param {number} opts.capRuns shell iteration budget; the config may tighten via loop.maxIterations, never exceed
 * @param {(type: string, data?: object) => object} opts.emit spine emitter
 * @param {object} opts.provider a bareagent provider — SHELL-owned binding (design decision 6)
 * @param {number} [opts.shellCapUsd=2] the shell's USD cap; config budgetUsd is clamped by validation
 * @returns {Promise<'green'|'escalated'|'config-red'>}
 */
export async function interpret(configRaw, { task, target, close, workdir, capRuns, emit, provider, shellCapUsd = 2 }) {
  const v = validateConfig(configRaw, { shellCapUsd });
  emit('config-validate', { ok: v.ok, reds: v.reds });
  if (!v.ok) {
    for (const r of v.reds) emit('config-red', r);
    emit('run-end', { outcome: 'config-red', iterations: 0 });
    return 'config-red';
  }
  const config = typeof configRaw === 'string' ? JSON.parse(configRaw) : configRaw;

  const lc = new LiteCtx({ root: workdir });
  const gate = new Gate({
    // bareguard fs.writeScope is prefix-containment, not glob (src/primitives/fs.js within());
    // the schema's trailing /** form maps to its directory prefix. Mid-path wildcards are not
    // expressible at the enforcement layer — logged as FINDINGS F4, not silently widened.
    fs: { writeScope: config.gate.writeScope.map((g) => resolve(workdir, g.replace(/\/\*\*?$/, ''))) },
    budget: { maxCostUsd: config.gate.budgetUsd },
    limits: { maxTurns: 8 * (capRuns + 1) },
    audit: { path: join(workdir, 'gate-audit.jsonl') },
    humanChannel: async () => ({ decision: 'terminate' }), // no human mid-run: a tripped cap terminates → decision-ready escalation
  });
  await gate.init();
  const { policy, onLlmResult } = wireGate(gate);
  const loop = new Loop({ provider, system: PERSONA, policy, onLlmResult });

  const slotOps = (slot) => config.hooks?.[slot] ?? [];
  const recallKinds = (op) => op.kinds ?? config.memory.recall?.kinds ?? ['fact'];

  async function ask(prompt) {
    try {
      return await loop.run([{ role: 'user', content: prompt }]);
    } catch (e) {
      if (e instanceof HaltError) e.category = 'cap-halt'; // USD/turn gate tripped — a cap story, not a bug
      throw e;
    }
  }

  async function runOps(slot, { iteration, gap, context }) {
    for (const op of slotOps(slot)) {
      if (op.op === 'recall') {
        const hits = [];
        for (const kind of recallKinds(op)) {
          hits.push(...await lc.recall(task, { kind, n: op.k ?? config.memory.recall?.k ?? 5, body: true }));
        }
        context.text = hits.map((h) => h.body ?? h.text ?? '').filter(Boolean).join('\n');
        context.level = null;
        emit('hook-op', { slot, op: 'recall', hits: hits.length, iteration });
      } else if (op.op === 'compress') {
        const level = op.level ?? config.memory.compressLevel ?? 'verbatim';
        if (context.text) context.text = await compress({ text: context.text, format: 'js' }, { level });
        emit('hook-op', { slot, op: 'compress', level, iteration });
      } else if (op.op === 'stash') {
        if (gap) lc.stash(`gap-${iteration}`, gap);
        emit('hook-op', { slot, op: 'stash', iteration });
      } else if (op.op === 'remember') {
        await lc.remember(`green-${iteration ?? 'final'}-${target.split('/').at(-1)}`, readFileSync(target, 'utf8'), { kind: op.kind ?? 'fact' });
        emit('hook-op', { slot, op: 'remember' });
      }
    }
  }

  const middle = async (iteration, gap) => {
    if (gap) await runOps('after-red', { iteration, gap, context: {} });
    const context = {};
    await runOps('before-attempt', { iteration, context });
    const parts = [task, context.text && `Possibly relevant notes:\n${context.text}`, gap && `Previous attempt failed the test suite:\n${gap}`];

    if (config.loop.shape === 'plan') {
      // plan-then-execute: one call to decompose, one to implement following the plan
      const p = await ask([`Produce a SHORT numbered implementation plan (2-4 steps) for this task. Plan only, no code.`, ...parts.slice(1), parts[0]].filter(Boolean).join('\n\n'));
      emit('worker-plan', { iteration, costUsd: p.cost ?? null });
      parts.push(`Follow this plan:\n${p.text}`);
    }
    const r = await ask(parts.filter(Boolean).join('\n\n'));
    emit('worker-result', { iteration, costUsd: r.cost ?? null, tokens: r.usage?.outputTokens ?? null });

    const decision = await gate.check({ type: 'write', path: target, args: { bytes: r.text.length } });
    if (decision.outcome !== 'allow') {
      const err = new Error(`gate ${decision.outcome} write to ${target} (${decision.rule ?? 'no rule'})`);
      err.category = decision.severity === 'halt' ? 'cap-halt' : 'gate-red';
      throw err;
    }
    writeFileSync(target, stripFences(r.text));
    emit('artifact-written', { iteration, path: target });
  };

  // the config may tighten the shell's iteration budget, never exceed it (mirrors budgetUsd)
  const effectiveCap = Math.min(capRuns, config.loop.maxIterations ?? capRuns);
  const outcome = await ralph({ middle, close, capRuns: effectiveCap, emit });
  if (outcome === 'green') await runOps('on-green', {});
  return outcome;
}
