// The authorship layer (M4) — the agent authors its HARNESS, never its arbiter
// (PRD §2). One sealed LLM call: task + catalog in, a schema v1 config out,
// validated before anything downstream sees it. Graduated from poc/probe-04.
//
// Honesty invariants carried from the POC:
// - The author sees the TASK and the CATALOG only — never the close/tests
//   (config-level fit-to-pass), never strategy coaching (the catalog renders the
//   SPACE faithfully; choosing within it is the agent's).
// - ONE shot, no retry: an invalid authored config is a result ({valid:false,
//   reds}) at zero worker tokens — data for the caller, never a throw or a
//   silent re-ask. The catalog is bound to the same vocabulary the validator
//   enforces (drift regression-guarded in tests/author.test.js).

import { createRequire } from 'node:module';
import { validateConfig, LOOP_SHAPES, SLOTS, VERBS } from './validate.js';

const require = createRequire(import.meta.url);
const { Loop } = require('bare-agent');

const stripFences = (t) => t.trim().replace(/^```[a-z]*\n?/i, '').replace(/\n?```\s*$/, '');

/**
 * Render the schema v1 catalog shown to the authoring agent: a faithful
 * description of the config space plus the run contract — no strategy advice.
 * @param {{ shellCapUsd?: number }} [opts]
 */
export function renderCatalog({ shellCapUsd = 2 } = {}) {
  return `You are configuring an automated coding harness. It will run a worker LLM in a
loop to write ONE JavaScript file; a hidden test suite (which neither you nor the worker ever
sees) judges each attempt, and its failure output is fed back to the worker on each red. You do
not write code — you author the harness config only.

The config is one JSON document, schema v1. Exact shape:

- "schema": must be "v1". (required)
- "loop": { "shape": ${LOOP_SHAPES.map((s) => `"${s}"`).join(' | ')}, "maxIterations": integer 1-8 (optional) }. "shape" is
  required. "refine" = one worker call per iteration; "plan" = a decompose call then an
  implement call per iteration.
- "memory": { "store": "litectx" (required), "recall": { "k": integer 1-20, "kinds": array from
  ["code","doc","fact","episode"] } (optional), "compressLevel": "verbatim" | "signature" |
  "drop" (optional) }. The store starts empty unless this run inherits one, and persists across
  iterations.
- "hooks": optional; up to 3 slots — ${SLOTS.map((s) => `"${s}"`).join(', ')} — with max 2 ops
  per slot ("before-attempt" runs before each worker call; "after-red" runs after a failed
  judgement, with the failure text available; "on-green" runs once after success). Ops
  (verbs: ${VERBS.join(', ')}):
    { "op": "recall", "k": 1-20, "kinds": [...] }   — pull matching notes from the store into
                                                      the worker's context (before-attempt).
    { "op": "compress", "level": "verbatim"|"signature"|"drop" } — compress recalled context.
    { "op": "stash" }                                — park the failure text in the store by key.
    { "op": "remember", "kind": "fact"|"episode" }   — save the artifact to the store; ONLY
                                                      legal in "on-green".
- "gate": { "budgetUsd": number > 0 and <= ${shellCapUsd}, "writeScope": non-empty array of path prefixes
  relative to the run directory; a trailing "/**" or "/*" covers everything under a directory,
  and no other wildcard placement is legal }. Both required. This caps the run's spend and where
  the artifact may be written. Run contract: the harness writes the artifact file inside the
  run directory's "src/" folder — a writeScope that does not cover it denies every write.
- "escalation": { "mode": "decision-ready" }. Required, exactly this value.

No other fields exist. Anything else (including any attempt to set the judge, tests, provider,
or model) makes the config invalid. Output ONLY the JSON document — no markdown fences, no
commentary.`;
}

/**
 * Author a config for one task. One sealed call, one shot, validated.
 * @param {object} opts
 * @param {string} opts.task the coding task the harness will run (never the close)
 * @param {object} opts.provider a bareagent provider — SHELL-owned, sealed per F8
 * @param {number} [opts.shellCapUsd=2] the shell's USD cap, echoed into the catalog
 * @returns {Promise<{config: object|null, valid: boolean, reds: Array<object>, costUsd: number, raw: string}>}
 */
export async function authorConfig({ task, provider, shellCapUsd = 2 }) {
  const loop = new Loop({ provider, system: 'You emit exactly one JSON document and nothing else.' });
  const r = await loop.run([{ role: 'user', content: `${renderCatalog({ shellCapUsd })}\n\nThe coding task your harness will run:\n${task}` }]);
  const raw = stripFences(r.text ?? '');
  let config = null;
  let reds;
  try {
    config = JSON.parse(raw);
    ({ reds } = validateConfig(config, { shellCapUsd }));
  } catch (e) {
    reds = [{ code: 'parse-error', path: '$', detail: String(e.message) }];
  }
  return { config, valid: reds.length === 0, reds, costUsd: r.cost ?? 0, raw };
}
