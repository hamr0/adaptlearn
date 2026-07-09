// M6 rules extractor — the gated-rules arm's inheritance representation
// (design docs/plans/2026-07-09-m6-inheritance-selection-design.md). One sealed
// LLM call after a green run distills/updates the lineage's rules list from
// LEDGER FACTS only: the green config, the prior rules, and the revision diff
// if the run recovered mid-run (the diff is the lesson — failure-transition
// evidence, free in the event log, PRD §5). It never sees the close, the tests,
// or the worker's code: rules describe the HARNESS, and showing the judge would
// open the config-level fit-to-pass surface.
//
// Honesty invariants (same family as author.js):
// - One shot, no retry: malformed output is a red as data — the caller keeps
//   the lineage's prior rules; there is never a silent empty inheritance.
// - The ≤MAX_RULES/≤MAX_RULE_CHARS bound is stated to the model but ENFORCED
//   mechanically post-call, and enforcement rejects whole — never trims
//   (M5's cap-touch rule: rejecting a half-applicable output beats silently
//   part-applying it).
// - Extractor spend is carried in costUsd and lands on the run's cost line
//   (§7b.3) — a representation whose upkeep rides free corrupts the ranking.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { Loop } = require('bare-agent');

export const MAX_RULES = 5;
export const MAX_RULE_CHARS = 200;

const stripFences = (t) => t.trim().replace(/^```[a-z]*\n?/i, '').replace(/\n?```\s*$/, '');

/**
 * Distill/update a lineage's rules from one green run's ledger facts.
 * @param {object} opts
 * @param {object} opts.config the config that went green
 * @param {object} opts.provider a bareagent provider — SHELL-owned, sealed per F8
 * @param {string[]|null} opts.priorRules the lineage's current rules, if any
 * @param {string[]} [opts.revisionDiff] changed config paths, when the run recovered mid-run
 * @returns {Promise<{rules: string[]|null, valid: boolean, reds: Array<object>, costUsd: number, raw: string}>}
 */
export async function extractRules({ config, provider, priorRules, revisionDiff }) {
  const loop = new Loop({ provider, system: 'You emit exactly one JSON document and nothing else.' });
  const prompt = `An automated coding harness just completed a run that PASSED its hidden judgement.
You maintain this harness lineage's inherited rules: short, general lessons about how to
configure the harness for this task family. You never see the tasks' tests or code — only
harness facts.

The config that went green:
${JSON.stringify(config, null, 2)}
${revisionDiff && revisionDiff.length > 0 ? `
This run stalled and recovered after revising these config paths mid-run (the revision that
turned red into green — strong evidence about what mattered):
${revisionDiff.join(', ')}
` : ''}${priorRules && priorRules.length > 0 ? `
The lineage's current rules — revise them: keep what still holds, drop what this run
contradicts, add at most what this run actually evidences:
${JSON.stringify(priorRules, null, 2)}
` : `
The lineage has no rules yet. Write only what this single run actually evidences.
`}
Output ONLY a JSON array of strings: at most ${MAX_RULES} rules, each at most ${MAX_RULE_CHARS}
characters. No markdown fences, no commentary.`;

  const r = await loop.run([{ role: 'user', content: prompt }]);
  const costUsd = r.cost ?? 0;
  const raw = stripFences(r.text ?? '');
  const red = (code, detail) => ({ rules: null, valid: false, reds: [{ code, detail }], costUsd, raw });

  let rules;
  try { rules = JSON.parse(raw); } catch (e) {
    return red('parse-error', String(e.message));
  }
  if (!Array.isArray(rules) || rules.length === 0 || !rules.every((x) => typeof x === 'string')) {
    return red('rules-shape', 'expected a non-empty JSON array of strings');
  }
  if (rules.length > MAX_RULES || rules.some((x) => x.length > MAX_RULE_CHARS)) {
    return red('rules-bound', `max ${MAX_RULES} rules of ${MAX_RULE_CHARS} chars — rejected whole, never trimmed`);
  }
  return { rules, valid: true, reds: [], costUsd, raw };
}
