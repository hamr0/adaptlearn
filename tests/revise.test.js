// M5 revisor seam — parse-only contract over a stub provider. Acceptance is
// NOT tested here because proposeRevision doesn't own it (src/interpret.js
// does; see tests/interpret.test.js M5 cases) — a revisor cannot vouch for
// its own output.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { proposeRevision } from '../src/revise.js';

const stub = (text) => ({ generate: async () => ({ text, usage: { inputTokens: 1, outputTokens: 1 }, costUsd: 0.02, toolCalls: [] }) });
const VALID = readFileSync(new URL('./fixtures/valid.json', import.meta.url), 'utf8');
const args = { config: JSON.parse(VALID), gaps: ['not ok 1 - adds'] };

test('valid JSON → candidate parsed, cost carried', async () => {
  const r = await proposeRevision({ ...args, provider: stub(VALID) });
  assert.equal(r.candidate.schema, 'v1');
  assert.equal(r.parseError, null);
  assert.ok(r.costUsd > 0, 'revision spend must be visible to the caller');
});

test('fenced JSON still parses', async () => {
  const r = await proposeRevision({ ...args, provider: stub('```json\n' + VALID + '\n```') });
  assert.equal(r.candidate.schema, 'v1');
});

test('garbage → null candidate + parseError as data, never a throw', async () => {
  const r = await proposeRevision({ ...args, provider: stub('let me think about this differently...') });
  assert.equal(r.candidate, null);
  assert.ok(r.parseError);
});

test('prompt carries config + stall evidence but never a close', async () => {
  let seen;
  const spy = { generate: async (messages) => { seen = messages.at(-1).content; return { text: VALID, usage: {}, toolCalls: [] }; } };
  await proposeRevision({ ...args, provider: spy });
  assert.ok(seen.includes('"schema": "v1"'), 'current config shown');
  assert.ok(seen.includes('not ok 1 - adds'), 'stall evidence shown');
  assert.ok(seen.includes('"gate", "escalation", and "loop.maxIterations" are FIXED'), 'immutables stated');
});

test('gate handlers ride along: onLlmResult sees the revisor call (PRD §7b.3 metering seam)', async () => {
  const recorded = [];
  const r = await proposeRevision({
    ...args,
    provider: stub(VALID),
    onLlmResult: (res) => recorded.push(res),
  });
  assert.equal(r.candidate.schema, 'v1');
  assert.equal(recorded.length, 1, 'the revisor call must be visible to the gate recorder');
});
