#!/usr/bin/env node
// probe-02 — M2 POC: a hand-authored schema-v1 config executes to a green close.
// Riskiest assumptions under test (PRD §6 M2 exit):
//   (1) the composed middle (validate → litectx store → bareguard gate → tool-free
//       bareagent Loop on local claude → interpreter-owned write) reaches a real green;
//   (2) a broken config reds before any tokens burn — red, not crash;
//   (3) the gate PROVABLY binds — an over-cap run halts with a cap-halt escalation
//       (this is A1's costUsd feeding bareguard's USD axis; if it never trips, this
//       scenario fails and the gate is decoration).
// Throwaway per house rules. Live tokens via local claude (clipipe), subscription.

import { createRequire } from 'node:module';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { Gate } from 'bareguard';
import { LiteCtx } from 'litectx';
import { makeSpine } from '../src/spine.js';
import { ralph } from '../src/ralph.js';
import { validateConfig } from '../src/validate.js';

const require = createRequire(import.meta.url);
const { Loop, wireGate, HaltError } = require('bare-agent');
const { CLIPipeProvider } = require('bare-agent/providers');

const PERSONA = 'You are a senior engineer. Reply with ONLY the complete contents of the requested JavaScript file — no markdown fences, no commentary. ESM.';
const stripFences = (t) => t.trim().replace(/^```[a-z]*\n?/i, '').replace(/\n?```\s*$/, '');

// ---- the interpreter (POC cut): config → a middle for ralph, plus an on-green hook ----
async function makeMiddle(config, { task, target, workdir, emit }) {
  const lc = new LiteCtx({ root: workdir });
  const gate = new Gate({
    fs: { writeScope: [target] },
    budget: { maxCostUsd: config.gate.budgetUsd },
    limits: { maxTurns: 20 },
    audit: { path: join(workdir, 'gate-audit.jsonl') },
    humanChannel: async () => ({ decision: 'terminate' }), // no human in a POC: cap trips terminate
  });
  await gate.init();
  const { policy, onLlmResult } = wireGate(gate);
  const provider = new CLIPipeProvider({ command: 'claude', args: ['-p', '--output-format', 'json'], parse: 'claude-json', timeout: 180_000 });
  // onLlmResult is a Loop CONSTRUCTOR option (adapter contract) — passing it to run() is silently ignored
  const loop = new Loop({ provider, system: PERSONA, policy, onLlmResult });

  const slotOps = (slot) => config.hooks?.[slot] ?? [];
  const middle = async (iteration, gap) => {
    if (gap) { // after-red ops react to the previous close's gap
      for (const op of slotOps('after-red')) {
        if (op.op === 'stash') { lc.stash(`gap-${iteration}`, gap); emit('hook-op', { slot: 'after-red', op: 'stash', iteration }); }
      }
    }
    let context = '';
    for (const op of slotOps('before-attempt')) {
      if (op.op === 'recall') {
        const hits = await lc.recall(task, { kind: 'fact', n: op.k ?? config.memory.recall?.k ?? 5, body: true });
        context = hits.map((h) => h.body ?? h.text ?? '').filter(Boolean).join('\n');
        emit('hook-op', { slot: 'before-attempt', op: 'recall', hits: hits.length, iteration });
      }
    }
    const prompt = [task, context && `Possibly relevant notes:\n${context}`, gap && `Previous attempt failed the test suite:\n${gap}`]
      .filter(Boolean).join('\n\n');
    let r;
    try {
      r = await loop.run([{ role: 'user', content: prompt }]);
    } catch (e) {
      if (e instanceof HaltError) { e.category = 'cap-halt'; } // USD gate tripped → shell reads it as cap-halt
      throw e;
    }
    emit('worker-result', { iteration, costUsd: r.cost ?? null, tokens: r.usage?.outputTokens ?? null });
    const decision = await gate.check({ type: 'write', path: target, args: { bytes: r.text.length } });
    if (decision.outcome !== 'allow') {
      const err = new Error(`gate ${decision.outcome} write to ${target} (${decision.rule ?? 'no rule'})`);
      if (decision.severity === 'halt') err.category = 'cap-halt'; // budget-exhausted deny is a cap story, not a bug
      throw err;
    }
    writeFileSync(target, stripFences(r.text));
    emit('artifact-written', { iteration, path: target });
  };
  const onGreen = async (artifactPath) => {
    for (const op of slotOps('on-green')) {
      if (op.op === 'remember') {
        await lc.remember(`green-${Date.now()}`, readFileSync(artifactPath, 'utf8'), { kind: op.kind ?? 'fact' });
        emit('hook-op', { slot: 'on-green', op: 'remember' });
      }
    }
  };
  return { middle, onGreen };
}

// interpret = validate (reds before tokens) → compose → hand the middle to the dumb shell
async function interpret(configRaw, { task, target, close, workdir, capRuns, emit }) {
  const v = validateConfig(configRaw);
  emit('config-validate', { ok: v.ok, reds: v.reds });
  if (!v.ok) {
    for (const r of v.reds) emit('config-red', r);
    emit('run-end', { outcome: 'config-red', iterations: 0 });
    return 'config-red';
  }
  const { middle, onGreen } = await makeMiddle(configRaw, { task, target, workdir, emit });
  const outcome = await ralph({ middle, close, capRuns, emit });
  if (outcome === 'green') await onGreen(target);
  return outcome;
}

// ---- fixtures: one easy relayfact-domain task with a GOLD oracle close ----
const work = mkdtempSync(join(tmpdir(), 'probe02-'));
const target = join(work, 'sum.mjs');
const suite = join(work, 'sum.test.mjs');
writeFileSync(suite, `
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sum } from './sum.mjs';
test('adds integers', () => assert.equal(sum(2, 3), 5));
test('adds negatives', () => assert.equal(sum(-2, -3), -5));
test('zero identity', () => assert.equal(sum(7, 0), 7));
test('floats', () => assert.ok(Math.abs(sum(0.1, 0.2) - 0.3) < 1e-9));
`);
const TASK = `Implement the file sum.mjs. It must export a named function \`sum(a, b)\` that returns the numeric sum of a and b.`;
const CLOSE = ['node', '--test', suite];
const config = JSON.parse(readFileSync(new URL('../tests/fixtures/valid.json', import.meta.url), 'utf8'));

const results = {};
async function scenario(name, cfg, opts) {
  const file = join(work, `run-${name}.jsonl`);
  const dir = join(work, name); mkdirSync(dir, { recursive: true });
  const outcome = await interpret(cfg, { workdir: dir, emit: makeSpine(file), ...opts });
  results[name] = { outcome, events: readFileSync(file, 'utf8').trimEnd().split('\n').map((l) => JSON.parse(l)) };
  console.log(`[${name}] → ${outcome}`);
}

// 1. valid config → green on the easy task
await scenario('green', config, { task: TASK, target, close: CLOSE, capRuns: 3 });
// 2. broken config → red before tokens, not a crash
const broken = JSON.parse(JSON.stringify(config)); delete broken.gate.writeScope;
await scenario('config-red', broken, { task: TASK, target: join(work, 'never.mjs'), close: CLOSE, capRuns: 3 });
// 3. gate binds: 2-cent budget, unpassable close → USD cap must trip → cap-halt
const tiny = JSON.parse(JSON.stringify(config)); tiny.gate.budgetUsd = 0.02;
await scenario('cap-halt', tiny, { task: TASK, target: join(work, 'cap', 'sum.mjs').replace('/cap/', '/cap-halt/'), close: ['node', '-e', 'process.exit(1)'], capRuns: 4 });

// ---- assertions (each can fail) ----
assert.equal(results.green.outcome, 'green', 'valid config must reach a real green');
assert.ok(existsSync(target) && readFileSync(target, 'utf8').includes('sum'), 'artifact really written');
assert.ok(results.green.events.some((e) => e.type === 'worker-result' && e.costUsd > 0), 'green run reports real USD cost (A1)');
assert.ok(results.green.events.some((e) => e.type === 'hook-op' && e.op === 'remember'), 'on-green remember ran (verdict-gated retention)');
assert.equal(results['config-red'].outcome, 'config-red');
assert.ok(!results['config-red'].events.some((e) => e.type === 'worker-result'), 'config red burned zero tokens');
assert.equal(results['config-red'].events.find((e) => e.type === 'config-red').code, 'missing-required');
assert.equal(results['cap-halt'].outcome, 'escalated', 'over-cap run must escalate');
assert.equal(results['cap-halt'].events.find((e) => e.type === 'escalation').category, 'cap-halt', 'gate trip reads as cap-halt, its own category');
assert.ok(results['cap-halt'].events.filter((e) => e.type === 'worker-result').length < 4, 'gate halted BEFORE the run cap — it binds');

console.log('\nprobe-02 PASS — M2 exit criteria observed');
console.log(`evidence: ${work}`);
for (const [name, r] of Object.entries(results)) {
  console.log(`\n[${name}]`);
  for (const e of r.events) console.log('  ' + JSON.stringify(e).slice(0, 220));
}
