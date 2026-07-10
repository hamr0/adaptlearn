// M6 mutation catalog — one knob at a time over schema v1's free axes (design
// docs/plans/2026-07-09-m6-inheritance-selection-design.md). Deterministic, no
// randomness: scalar axes cycle fixed menus; kinds grows first (add first
// missing, shrink only when full — F19 reachability), slots ping-pong by a
// single add/remove-last; every transition is exactly one
// diffPaths knob (array-index diffs count individually). Menus bind to
// validator/litectx exports, never to copies (F5/F9: mirror enforcement).
//
// The picker is novelty-preferring — least-recently-explored axis, AXES-order
// tie-break — a mechanism against population collapse, never a fitness term
// (PRD §7b.4). Legality is decided by validateConfig on the mutant: an illegal
// mutant is a red before tokens, and the picker simply never offers it.

import { COMPRESS_LEVELS, KINDS, WRITE_KINDS } from 'litectx';
import { validateConfig, LOOP_SHAPES } from './validate.js';

/** Fixed free-axis contract; order is the picker's tie-break. */
export const AXES = [
  'loop.shape',
  'loop.maxIterations',
  'memory.recall.k',
  'memory.recall.kinds',
  'memory.compressLevel',
  'hooks.before-attempt',
  'hooks.after-red',
  'hooks.on-green',
];

const SCALAR_MENUS = {
  'loop.shape': LOOP_SHAPES,
  'loop.maxIterations': [1, 2, 4, 8],
  'memory.recall.k': [1, 5, 10, 20],
  'memory.compressLevel': COMPRESS_LEVELS,
};

// one canonical op per slot: what "add" adds when the slot is empty. on-green's
// is a remember — the only slot where that verb is legal (retention is gated).
const CANONICAL_OPS = {
  'before-attempt': { op: 'recall', k: 8 },
  'after-red': { op: 'stash' },
  'on-green': { op: 'remember', kind: WRITE_KINDS.filter((k) => k !== 'doc')[0] },
};

const clone = (v) => JSON.parse(JSON.stringify(v));

// next menu value: cyclic step from the current one; off-menu numerics step from
// their floor (largest menu value <= current); anything else starts at menu[0].
function nextInMenu(menu, current) {
  if (current === undefined) return menu[0];
  let i = menu.indexOf(current);
  if (i === -1 && typeof current === 'number') {
    const floor = menu.filter((v) => v <= current);
    i = floor.length ? menu.indexOf(floor[floor.length - 1]) : menu.length - 1;
  }
  return i === -1 ? menu[0] : menu[(i + 1) % menu.length];
}

/**
 * Produce the deterministic one-knob mutant of `parent` along `axis`.
 * Pure — the parent is never edited. Legality is NOT checked here; callers
 * use legalMutations/pickMutation, which red illegal mutants before tokens.
 * @param {object} parent a schema-v1 config
 * @param {string} axis one of AXES
 * @returns {object} the mutant config
 */
export function mutate(parent, axis) {
  if (!AXES.includes(axis)) throw new Error(`unknown mutation axis: ${axis}`);
  const c = clone(parent);

  if (axis in SCALAR_MENUS) {
    const [head, key] = axis.split('.').length === 2 ? axis.split('.') : [null, null];
    if (axis === 'memory.recall.k') {
      c.memory.recall = c.memory.recall ?? {};
      c.memory.recall.k = nextInMenu(SCALAR_MENUS[axis], c.memory.recall.k);
    } else {
      c[head][key] = nextInMenu(SCALAR_MENUS[axis], c[head]?.[key]);
    }
    return c;
  }

  if (axis === 'memory.recall.kinds') {
    // Grow-first (F18/F19): add the first missing kind in KINDS order; shrink
    // only when full. The old shrink-first rule made a missing kind unreachable
    // from any multi-kind parent — the winning knob sat outside the catalog's
    // reach (F13's mirror). Still deterministic, still exactly one diffPaths knob.
    c.memory.recall = c.memory.recall ?? {};
    const kinds = c.memory.recall.kinds ?? [];
    const missing = KINDS.filter((k) => !kinds.includes(k));
    c.memory.recall.kinds = missing.length > 0 ? [...kinds, missing[0]] : kinds.slice(0, -1);
    return c;
  }

  const slot = axis.slice('hooks.'.length);
  c.hooks = c.hooks ?? {};
  const ops = c.hooks[slot] ?? [];
  c.hooks[slot] = ops.length > 0 ? ops.slice(0, -1) : [clone(CANONICAL_OPS[slot])];
  return c;
}

/**
 * Every axis's mutant of `parent`, each carrying its validation reds.
 * An entry with non-empty reds is a red before tokens — loggable, never runnable.
 * @returns {Array<{axis: string, mutant: object, reds: Array<object>}>}
 */
export function legalMutations(parent) {
  return AXES.map((axis) => {
    const mutant = mutate(parent, axis);
    return { axis, mutant, reds: validateConfig(mutant).reds };
  });
}

/**
 * Novelty-preferring pick: the legal axis least recently seen in `history`
 * (the ledger's knobMutated column, oldest → newest); never-explored axes win,
 * ties break by AXES order. Null when no axis yields a green mutant.
 * @param {object} parent a schema-v1 config
 * @param {string[]} history previously mutated axis names, oldest first
 * @returns {{axis: string, mutant: object} | null}
 */
export function pickMutation(parent, history) {
  const legal = legalMutations(parent).filter(({ reds }) => reds.length === 0);
  if (legal.length === 0) return null;
  let best = null;
  let bestSeen = Infinity;
  for (const { axis, mutant } of legal) {
    const seen = history.lastIndexOf(axis);
    if (seen < bestSeen) { best = { axis, mutant }; bestSeen = seen; }
    if (bestSeen === -1) break; // never-explored, first in AXES order — done
  }
  return best;
}
