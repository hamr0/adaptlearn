// M6 mutation catalog: every legal mutant is one knob (diffPaths = 1), validates
// green before any tokens burn, and is produced deterministically (no randomness —
// scalar axes cycle fixed menus, list axes ping-pong add/remove-last). The picker
// is novelty-preferring: least-recently-explored axis, fixed AXES order tie-break.
// Menus bind to validator/litectx exports (F5/F9: mirror enforcement, not docs).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateConfig, diffPaths, LOOP_SHAPES } from '../src/validate.js';
import { AXES, mutate, legalMutations, pickMutation } from '../src/mutate.js';

const fixtures = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const load = (name) => JSON.parse(readFileSync(join(fixtures, name), 'utf8'));
const valid = () => load('valid.json');

test('AXES is the fixed free-axis contract, in picker tie-break order', () => {
  assert.deepEqual(AXES, [
    'loop.shape',
    'loop.maxIterations',
    'memory.recall.k',
    'memory.recall.kinds',
    'memory.compressLevel',
    'hooks.before-attempt',
    'hooks.after-red',
    'hooks.on-green',
  ]);
});

test('every axis yields a mutant of the valid fixture: green, exactly one knob', () => {
  const parent = valid();
  const all = legalMutations(parent);
  assert.equal(all.length, AXES.length);
  for (const { axis, mutant, reds } of all) {
    assert.deepEqual(reds, [], `${axis} mutant must validate green`);
    assert.equal(validateConfig(mutant).ok, true, `${axis} mutant re-validates`);
    const changed = diffPaths(parent, mutant);
    assert.equal(changed.length, 1, `${axis} must change exactly one knob, got ${changed}`);
    const [path] = changed;
    assert.ok(
      path.startsWith(axis) || axis.startsWith(path),
      `${axis} mutant changed unrelated path ${path}`,
    );
  }
});

test('mutation is deterministic — same parent, same mutant', () => {
  const a = legalMutations(valid());
  const b = legalMutations(valid());
  assert.deepEqual(a, b);
});

test('mutation never edits the parent in place', () => {
  const parent = valid();
  const snapshot = JSON.parse(JSON.stringify(parent));
  legalMutations(parent);
  mutate(parent, 'loop.shape');
  assert.deepEqual(parent, snapshot);
});

test('scalar axes cycle their menus', () => {
  const parent = valid(); // shape refine, maxIterations 4, k 5, compressLevel signature
  assert.equal(mutate(parent, 'loop.shape').loop.shape, LOOP_SHAPES[1]); // refine → plan
  const back = mutate(mutate(parent, 'loop.shape'), 'loop.shape');
  assert.equal(back.loop.shape, parent.loop.shape); // two-cycle returns

  assert.equal(mutate(parent, 'loop.maxIterations').loop.maxIterations, 8); // 4 → 8 in [1,2,4,8]
  assert.equal(mutate(parent, 'memory.recall.k').memory.recall.k, 10); // 5 → 10 in [1,5,10,20]
});

test('off-menu scalar steps to the next menu value above its floor', () => {
  const parent = valid();
  parent.memory.recall.k = 8; // between menu 5 and 10 → next after floor(5) is 10
  assert.equal(mutate(parent, 'memory.recall.k').memory.recall.k, 10);
});

test('absent optional scalar is added at the first menu value (one knob)', () => {
  const parent = valid();
  delete parent.loop.maxIterations;
  const mutant = mutate(parent, 'loop.maxIterations');
  assert.equal(mutant.loop.maxIterations, 1);
  assert.deepEqual(diffPaths(parent, mutant), ['loop.maxIterations']);
});

test('kinds grows first (first missing in KINDS order), shrinks only when full', () => {
  const parent = valid(); // kinds ["fact","episode"]
  const grown = mutate(parent, 'memory.recall.kinds').memory.recall.kinds;
  assert.deepEqual(grown, ['fact', 'episode', 'code']); // append-only — never reorders (one knob)
  parent.memory.recall.kinds = ['code', 'doc', 'fact', 'episode']; // full set
  assert.deepEqual(mutate(parent, 'memory.recall.kinds').memory.recall.kinds, ['code', 'doc', 'fact']);
});

test('kinds reachability (F19): every kind — episode included — is reachable from a 3-kind parent', () => {
  const parent = valid();
  parent.memory.recall.kinds = ['code', 'doc', 'fact']; // the typical authored config
  const grown = mutate(parent, 'memory.recall.kinds').memory.recall.kinds;
  assert.ok(grown.includes('episode'), 'one mutation must reach the winning knob');
});

test('slot axes toggle: non-empty removes last op, empty adds the canonical op', () => {
  const parent = valid(); // each slot has one op
  for (const slot of ['before-attempt', 'after-red', 'on-green']) {
    const removed = mutate(parent, `hooks.${slot}`);
    assert.deepEqual(removed.hooks[slot], [], `${slot} → remove last`);
    const added = mutate(removed, `hooks.${slot}`);
    assert.equal(added.hooks[slot].length, 1, `${slot} → add canonical`);
    assert.equal(validateConfig(added).ok, true, `${slot} canonical op validates`);
    assert.deepEqual(diffPaths(removed, added), [`hooks.${slot}.0`]);
  }
});

test('remember stays on-green-only: the on-green canonical op is a remember', () => {
  const emptied = mutate(valid(), 'hooks.on-green');
  const added = mutate(emptied, 'hooks.on-green');
  assert.equal(added.hooks['on-green'][0].op, 'remember');
});

test('a red parent yields no legal mutations — mutation never repairs non-free axes', () => {
  const parent = valid();
  delete parent.escalation; // red on a non-free axis; no free-axis knob can fix it
  const all = legalMutations(parent);
  assert.ok(all.every(({ reds }) => reds.length > 0));
  assert.equal(pickMutation(parent, []), null);
});

test('picker prefers never-explored axes in AXES order', () => {
  const parent = valid();
  assert.equal(pickMutation(parent, []).axis, AXES[0]);
  assert.equal(pickMutation(parent, ['loop.shape']).axis, AXES[1]);
});

test('picker chooses the least-recently-explored axis once all are explored', () => {
  const parent = valid();
  assert.equal(pickMutation(parent, [...AXES]).axis, AXES[0]); // oldest = first explored
  const history = [...AXES, 'loop.shape']; // shape re-explored → maxIterations now oldest
  assert.equal(pickMutation(parent, history).axis, AXES[1]);
});

test('picker result is a legal one-knob green mutant', () => {
  const parent = valid();
  const { mutant } = pickMutation(parent, []);
  assert.equal(validateConfig(mutant).ok, true);
  assert.equal(diffPaths(parent, mutant).length, 1);
});

// Harmony walk (F5/F9): drive each axis several steps from the valid fixture; every
// intermediate mutant must validate green. If litectx menus or validator bounds
// drift, this walk reds — the catalog mirrors enforcement, not documentation.
test('harmony: repeated mutation along every axis stays green', () => {
  for (const axis of AXES) {
    let config = valid();
    for (let step = 0; step < 6; step++) {
      config = mutate(config, axis);
      const r = validateConfig(config);
      assert.deepEqual(r.reds, [], `${axis} step ${step + 1} must stay green`);
    }
  }
});
