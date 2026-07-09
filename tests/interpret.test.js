// M2 exit criteria as behavior tests: green on valid config, broken config → red
// not crash (zero tokens), gate provably binds (over-cap halts). Everything is real
// (Loop, Gate, LiteCtx, ralph, a real node --test close) except the LLM: the
// provider is a scripted stub — which is the legitimate seam, since the provider
// is a SHELL-owned binding by design (never the config's).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeSpine } from '../src/spine.js';
import { interpret } from '../src/interpret.js';

const base = mkdtempSync(join(tmpdir(), 'interpret-test-'));

// scripted provider: returns each script entry in turn (sticks on the last), counts calls
function stubProvider(script) {
  const calls = [];
  return {
    calls,
    async generate(messages) {
      const s = script[Math.min(calls.length, script.length - 1)];
      calls.push(messages.at(-1).content);
      return { text: s.text, toolCalls: [], usage: { inputTokens: 10, outputTokens: 10 }, costUsd: s.costUsd ?? 0.001, model: null };
    },
  };
}

const GOOD_SUM = 'export function sum(a, b) { return a + b; }\n';
const BAD_SUM = 'export function sum(a, b) { return a - b; }\n';
const TASK = 'Implement sum.mjs exporting sum(a, b) returning the numeric sum.';

// artifact lives under src/ (inside valid.json's writeScope "src/**"); the suite
// lives OUTSIDE the scope — a harness can never edit its own close
function makeWork(name) {
  const workdir = join(base, name);
  mkdirSync(join(workdir, 'src'), { recursive: true });
  const target = join(workdir, 'src', 'sum.mjs');
  const suite = join(workdir, 'sum.test.mjs');
  writeFileSync(suite, `
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sum } from './src/sum.mjs';
test('adds', () => assert.equal(sum(2, 3), 5));
`);
  return { workdir, target, close: ['node', '--test', suite] };
}

const config = () => JSON.parse(readFileSync(new URL('./fixtures/valid.json', import.meta.url), 'utf8'));

async function run(name, cfg, { script = [{ text: GOOD_SUM }], capRuns = 3, ...rest } = {}) {
  const { workdir, target, close } = makeWork(name);
  const provider = stubProvider(script);
  const file = join(workdir, 'run.jsonl');
  const outcome = await interpret(cfg, { task: TASK, target, close, workdir, capRuns, emit: makeSpine(file), provider, ...rest });
  const events = readFileSync(file, 'utf8').trimEnd().split('\n').map((l) => JSON.parse(l));
  return { outcome, events, provider, target, workdir };
}

test('valid config + correct artifact → green; artifact on disk; on-green remember ran', async () => {
  const { outcome, events, target } = await run('green', config());
  assert.equal(outcome, 'green');
  assert.equal(readFileSync(target, 'utf8'), GOOD_SUM.trim()); // stripFences trims — the close, not bytes, is the contract
  assert.ok(events.some((e) => e.type === 'hook-op' && e.op === 'remember'), 'verdict-gated retention fired');
  assert.ok(events.some((e) => e.type === 'worker-result' && e.costUsd > 0), 'provider cost reached the spine');
});

test('gap feedback reaches the second attempt (refine wiring)', async () => {
  const { outcome, provider } = await run('refine-gap', config(), { script: [{ text: BAD_SUM }, { text: GOOD_SUM }] });
  assert.equal(outcome, 'green');
  assert.equal(provider.calls.length, 2);
  assert.match(provider.calls[1], /failed the test suite/, 'second prompt carries the close gap');
});

test('broken config → config-red, not a crash, and ZERO provider calls', async () => {
  const broken = config();
  delete broken.gate.writeScope;
  const { outcome, events, provider } = await run('config-red', broken);
  assert.equal(outcome, 'config-red');
  assert.equal(provider.calls.length, 0, 'reds before tokens burn');
  assert.equal(events.find((e) => e.type === 'config-red').path, 'gate.writeScope');
});

test('gate provably binds: over-cap run halts as cap-halt, its own category', async () => {
  const tiny = config();
  tiny.gate.budgetUsd = 0.02;
  const { outcome, events, provider } = await run('cap-halt', tiny, {
    script: [{ text: BAD_SUM, costUsd: 0.05 }], capRuns: 4, // every attempt red + each call over the whole budget
  });
  assert.equal(outcome, 'escalated');
  const esc = events.find((e) => e.type === 'escalation');
  assert.equal(esc.category, 'cap-halt');
  assert.ok(esc.decisionReady);
  assert.ok(provider.calls.length < 4, `gate halted before the run cap (calls: ${provider.calls.length})`);
  assert.ok(events.some((e) => e.type === 'cap-halt'), 'cap-halt event present, never merged with wrong');
});

test('write outside the config writeScope → gate-red, not interpreter-red', async () => {
  const scoped = config();
  scoped.gate.writeScope = ['allowed-dir/**'];
  const { outcome, events } = await run('gate-red', scoped);
  assert.equal(outcome, 'escalated');
  const esc = events.find((e) => e.type === 'escalation');
  assert.equal(esc.category, 'gate-red');
  assert.ok(!existsSync(join(base, 'gate-red', 'src', 'sum.mjs')), 'nothing written outside scope');
});

test('loop.shape is wired in: plan makes a plan call before the implement call', async () => {
  const planned = config();
  planned.loop.shape = 'plan';
  const { outcome, events, provider } = await run('plan-shape', planned, {
    script: [{ text: '1. write sum\n2. export it' }, { text: GOOD_SUM }],
  });
  assert.equal(outcome, 'green');
  assert.equal(provider.calls.length, 2, 'plan shape = decompose call + implement call');
  assert.ok(events.some((e) => e.type === 'worker-plan'), 'plan call on the spine');
  assert.match(provider.calls[1], /Follow this plan/, 'implement call carries the plan');
});

test('config maxIterations tightens the shell cap, never exceeds it', async () => {
  const short = config();
  short.loop.maxIterations = 2;
  const { outcome, events } = await run('tighten', short, { script: [{ text: BAD_SUM }], capRuns: 5 });
  assert.equal(outcome, 'escalated');
  assert.equal(events.at(-1).iterations, 2, 'stopped at the config bound, under the shell cap');
});

test('interpreter crash mid-run → interpreter-red, never masquerading as bad harness', async () => {
  const provider = { async generate() { throw new Error('provider exploded'); } };
  const { workdir, target, close } = makeWork('interp-red');
  const file = join(workdir, 'run.jsonl');
  const outcome = await interpret(config(), { task: TASK, target, close, workdir, capRuns: 3, emit: makeSpine(file), provider });
  const events = readFileSync(file, 'utf8').trimEnd().split('\n').map((l) => JSON.parse(l));
  assert.equal(outcome, 'escalated');
  assert.equal(events.find((e) => e.type === 'escalation').category, 'interpreter-red');
});
