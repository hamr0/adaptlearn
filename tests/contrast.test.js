// M3 machinery regression — the contrast pair itself (PRD §6 M3; design §"M3
// acceptance test"). The LIVE result (MAX green@1 vs MIN escalated@4 on the same
// task/shell/store — FINDINGS F7) cannot run in CI; what CI protects is the pair's
// shape: both arms stay schema-legal, the opposition stays exactly the designed
// axes, and the arbiter-adjacent sections stay identical (gate/escalation are
// never contrast variables). If a schema change silently invalidates an arm or
// collapses an axis, the M3 result stops being reproducible — these tests fail.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateConfig, diffPaths, SLOTS } from '../src/validate.js';

const load = (n) => JSON.parse(readFileSync(new URL(`./fixtures/${n}.json`, import.meta.url), 'utf8'));
const MAX = load('contrast-max');
const MIN = load('contrast-min');

test('both arms are schema-legal (reds would burn the contrast before tokens)', () => {
  for (const [name, cfg] of [['MAX', MAX], ['MIN', MIN]]) {
    const v = validateConfig(cfg);
    assert.deepEqual(v.reds, [], `${name} must validate green`);
  }
});

test('opposition is exactly the designed axes — no more, no fewer', () => {
  assert.deepEqual(diffPaths(MAX, MIN), [
    'hooks.after-red',
    'hooks.before-attempt',
    'hooks.on-green',
    'loop.maxIterations',
    'loop.shape',
    'memory.compressLevel',
    'memory.recall.k',
    'memory.recall.kinds',
  ]);
});

test('arbiter-adjacent sections are identical between arms', () => {
  assert.deepEqual(MAX.gate, MIN.gate, 'gate is not a contrast axis');
  assert.deepEqual(MAX.escalation, MIN.escalation, 'escalation is not a contrast axis');
});

test('MAX populates every slot; MIN populates none', () => {
  for (const slot of SLOTS) {
    assert.ok((MAX.hooks[slot] ?? []).length > 0, `MAX must populate ${slot}`);
  }
  assert.deepEqual(MIN.hooks, {}, 'MIN slots must be empty');
});
