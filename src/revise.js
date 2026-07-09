// The mid-run revisor (M5) — one sealed LLM call that proposes a revised config
// when the run stalls. Graduated from poc/probe-05. Deliberately DUMB about
// acceptance: it parses, nothing more. Validation, arbiter immutability
// (gate/escalation), and cap immutability (loop.maxIterations is snapshotted at
// run start) are enforced by the INTERPRETER on whatever comes back — a revisor
// cannot vouch for its own output (src/interpret.js, the only acceptance path).
//
// The revisor sees the current config, the catalog, and the stall evidence (gap
// text the worker already receives) — never the close.

import { createRequire } from 'node:module';
import { renderCatalog } from './author.js';

const require = createRequire(import.meta.url);
const { Loop } = require('bare-agent');

const stripFences = (t) => t.trim().replace(/^```[a-z]*\n?/i, '').replace(/\n?```\s*$/, '');

/**
 * Propose a revised config for a stalled run. One shot; parse-only.
 * @param {object} opts
 * @param {object} opts.config the currently active config
 * @param {string[]} opts.gaps consecutive failure outputs (most recent last)
 * @param {object} opts.provider a bareagent provider — SHELL-owned, sealed per F8
 * @param {number} [opts.shellCapUsd=2]
 * @param {object} [opts.policy] gate-wired policy from the RUN's own gate (PRD §7b.3: revisor
 *        spend is metered by the same budget axis as the worker — no free tokens mid-run)
 * @param {Function} [opts.onLlmResult] gate-wired usage recorder, same gate as policy
 * @returns {Promise<{candidate: object|null, parseError: string|null, costUsd: number, raw: string}>}
 */
export async function proposeRevision({ config, gaps, provider, shellCapUsd = 2, policy, onLlmResult }) {
  const loop = new Loop({ provider, system: 'You emit exactly one JSON document and nothing else.', policy, onLlmResult });
  const prompt = `${renderCatalog({ shellCapUsd })}

Your harness is MID-RUN and STALLED: ${gaps.length} consecutive attempts failed the hidden
test suite. Its current config:

${JSON.stringify(config, null, 2)}

Most recent failure output:
${gaps.at(-1).slice(0, 1500)}

Revise the config so the remaining iterations can recover. You may change "loop.shape",
"memory", and "hooks" only. "gate", "escalation", and "loop.maxIterations" are FIXED — copy
them into your output unchanged. Output ONLY the full revised JSON config.`;
  const r = await loop.run([{ role: 'user', content: prompt }]);
  const raw = stripFences(r.text ?? '');
  try {
    return { candidate: JSON.parse(raw), parseError: null, costUsd: r.cost ?? 0, raw };
  } catch (e) {
    return { candidate: null, parseError: String(e.message), costUsd: r.cost ?? 0, raw };
  }
}
