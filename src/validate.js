// Schema v1 validator — a deterministic predicate that runs before any tokens burn
// (PRD §2; design docs/plans/2026-07-08-schema-v1-design.md). Every failure is a
// distinct named red { code, path, detail } so the spine can carry
// `config-red: missing-required:gate.writeScope`. An invalid config is a red, not
// a crash: this module never throws on bad input.
//
// The vocabulary is BOUND from litectx (FINDINGS F1 — consume, don't build); v1
// exposes a 4-verb subset of it. The close and the provider are deliberately not
// expressible here: they arrive as unknown-field reds (the shell owns both).

import { COMPRESS_LEVELS, KINDS } from 'litectx';

export const LOOP_SHAPES = ['refine', 'plan'];
export const SLOTS = ['before-attempt', 'after-red', 'on-green'];
export const VERBS = ['recall', 'compress', 'stash', 'remember'];
const TOP_FIELDS = ['schema', 'loop', 'memory', 'hooks', 'gate', 'escalation'];
const MAX_OPS_PER_SLOT = 2;

// per-verb parameter contracts: name → check(value) (op field itself excluded)
const VERB_PARAMS = {
  recall: { k: (v) => Number.isInteger(v) && v >= 1 && v <= 20, kinds: isKinds },
  compress: { level: (v) => COMPRESS_LEVELS.includes(v) },
  stash: {},
  remember: { kind: (v) => KINDS.includes(v) },
};

function isKinds(v) {
  return Array.isArray(v) && v.length > 0 && v.every((k) => KINDS.includes(k));
}
function isObj(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Validate a harness config against schema v1.
 * @param {object|string} input parsed config, or raw JSON text (parse failures are a red)
 * @param {{ shellCapUsd?: number }} [opts] the shell's cap — a config may tighten it, never exceed it
 * @returns {{ ok: boolean, reds: Array<{code: string, path: string, detail?: string}> }}
 */
export function validateConfig(input, { shellCapUsd = 2 } = {}) {
  const reds = [];
  const red = (code, path, detail) => reds.push(detail ? { code, path, detail } : { code, path });

  let c = input;
  if (typeof c === 'string') {
    try { c = JSON.parse(c); } catch (e) {
      return { ok: false, reds: [{ code: 'parse-error', path: '$', detail: String(e.message) }] };
    }
  }
  if (!isObj(c)) return { ok: false, reds: [{ code: 'parse-error', path: '$', detail: 'config must be a JSON object' }] };

  // 1. shape — unknown top-level fields red here (smuggled close/provider included)
  for (const key of Object.keys(c)) {
    if (!TOP_FIELDS.includes(key)) red('unknown-field', key);
  }
  if (c.schema === undefined) red('missing-required', 'schema');
  else if (c.schema !== 'v1') red('invalid-value', 'schema', `expected "v1", got ${JSON.stringify(c.schema)}`);

  // 2. required bindings + 3. bounds, section by section
  const loop = isObj(c.loop) ? c.loop : {};
  if (loop.shape === undefined) red('missing-required', 'loop.shape');
  else if (!LOOP_SHAPES.includes(loop.shape)) red('invalid-value', 'loop.shape', `menu: ${LOOP_SHAPES.join('|')}`);
  if (loop.maxIterations !== undefined
      && !(Number.isInteger(loop.maxIterations) && loop.maxIterations >= 1 && loop.maxIterations <= 8)) {
    red('bounds', 'loop.maxIterations', '1..8');
  }

  const memory = isObj(c.memory) ? c.memory : {};
  if (memory.store === undefined) red('missing-required', 'memory.store');
  else if (memory.store !== 'litectx') red('invalid-value', 'memory.store', 'v1 binds "litectx"');
  if (isObj(memory.recall)) {
    const { k, kinds } = memory.recall;
    if (k !== undefined && !(Number.isInteger(k) && k >= 1 && k <= 20)) red('bounds', 'memory.recall.k', '1..20');
    if (kinds !== undefined && !isKinds(kinds)) red('invalid-value', 'memory.recall.kinds', `subset of ${KINDS.join('|')}`);
  }
  if (memory.compressLevel !== undefined && !COMPRESS_LEVELS.includes(memory.compressLevel)) {
    red('invalid-value', 'memory.compressLevel', COMPRESS_LEVELS.join('|'));
  }

  const gate = isObj(c.gate) ? c.gate : {};
  if (gate.budgetUsd === undefined) red('missing-required', 'gate.budgetUsd');
  else if (!(typeof gate.budgetUsd === 'number' && gate.budgetUsd > 0 && gate.budgetUsd <= shellCapUsd)) {
    red('bounds', 'gate.budgetUsd', `0 < budget <= shell cap ${shellCapUsd}`);
  }
  if (gate.writeScope === undefined) red('missing-required', 'gate.writeScope');
  else if (!(Array.isArray(gate.writeScope) && gate.writeScope.length > 0
             && gate.writeScope.every((s) => typeof s === 'string' && s.length > 0))) {
    red('invalid-value', 'gate.writeScope', 'non-empty array of glob strings');
  }

  const escalation = isObj(c.escalation) ? c.escalation : {};
  if (escalation.mode === undefined) red('missing-required', 'escalation.mode');
  else if (escalation.mode !== 'decision-ready') red('invalid-value', 'escalation.mode', 'must be "decision-ready"');

  // 4. verb legality inside the slots
  if (c.hooks !== undefined) {
    const hooks = isObj(c.hooks) ? c.hooks : {};
    if (!isObj(c.hooks)) red('invalid-value', 'hooks', 'must be an object of slots');
    for (const [slot, ops] of Object.entries(hooks)) {
      const at = `hooks.${slot}`;
      if (!SLOTS.includes(slot)) { red('unknown-field', at); continue; }
      if (!Array.isArray(ops)) { red('invalid-value', at, 'must be an array of ops'); continue; }
      if (ops.length > MAX_OPS_PER_SLOT) { red('slot-overflow', at, `max ${MAX_OPS_PER_SLOT} ops`); continue; }
      ops.forEach((op, i) => {
        const opAt = `${at}.${i}`;
        if (!isObj(op) || !VERBS.includes(op.op)) { red('verb-illegal', opAt, `verbs: ${VERBS.join('|')}`); return; }
        if (op.op === 'remember' && slot !== 'on-green') {
          red('verb-placement', opAt, 'remember is legal only in on-green (retention is verdict-gated)');
          return;
        }
        const params = VERB_PARAMS[op.op];
        for (const [key, value] of Object.entries(op)) {
          if (key === 'op') continue;
          if (!(key in params)) red('verb-params', `${opAt}.${key}`, `unknown param for ${op.op}`);
          else if (!params[key](value)) red('verb-params', `${opAt}.${key}`, `invalid value for ${op.op}.${key}`);
        }
      });
    }
  }

  return { ok: reds.length === 0, reds };
}

/**
 * Changed JSON paths between two configs — the one-knob mutation checker (M6:
 * a legal mutant has exactly one). A subtree present on only one side counts as
 * ONE path (its root), so "add an op to a slot" is one knob, not two params.
 * @returns {string[]} sorted changed paths, dot-notation with array indices
 */
export function diffPaths(a, b) {
  const paths = [];
  walk(a, b, '');
  return paths.sort();

  function walk(x, y, at) {
    if (x === y) return;
    const bothObj = isObj(x) && isObj(y);
    const bothArr = Array.isArray(x) && Array.isArray(y);
    if (!bothObj && !bothArr) {
      if (JSON.stringify(x) !== JSON.stringify(y)) paths.push(at || '$');
      return;
    }
    const keys = new Set([...Object.keys(x), ...Object.keys(y)]);
    for (const key of keys) {
      const p = at ? `${at}.${key}` : key;
      if (!(key in x) || !(key in y)) paths.push(p); // added/removed subtree = one knob
      else walk(x[key], y[key], p);
    }
  }
}
