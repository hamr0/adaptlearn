# Changelog

All notable changes to adaptlearn are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[SemVer](https://semver.org/) (0.y.z pre-release: minor = a ladder module or spec milestone,
patch = corrections). Versions before code exist are retroactive spec milestones.

## [Unreleased]

- M2: interpreter (first live tokens; hand-authored config → green close on one easy task)
- Pending upstream: A1 (bareagent clipipe structured-output parsing) — see
  `docs/00-context/UPSTREAM-ASKS.md`

## [0.5.0] — 2026-07-08

### Added
- **M1 graduated:** `src/validate.js` — schema v1 validator, a deterministic predicate that
  reds before tokens burn. Distinct named reds (`missing-required` / `invalid-value` /
  `unknown-field` / `bounds` / `slot-overflow` / `verb-illegal` / `verb-placement` /
  `verb-params`, each with a JSON path); never throws on bad input. Vocabulary bound from
  litectx exports (`COMPRESS_LEVELS`, `KINDS` — FINDINGS F1), 4-verb subset, `remember`
  legal only in `on-green`. Includes `diffPaths` — the one-knob mutation checker (a legal
  M6 mutant changes exactly one path; an added/removed subtree counts as one knob).
- `tests/fixtures/` — one valid config + 22 red fixtures + a parse-error fixture, each
  isolating exactly one defect; `tests/validate.test.js` (31 tests, written before the
  implementation and failing first).
- `litectx` file-dependency (first of the three libs consumed).

### Changed
- PRD v1.2 (§3.5): no-papering-over doctrine for lib gaps — log finding → fix upstream →
  consume → continue. (`ccc57bd`)
- `docs/00-context/UPSTREAM-ASKS.md` — A1: exact spec for clipipe `parse: 'claude-json'`
  (map result/usage/total_cost_usd onto GenerateResult; loud errors; regression-guarded).
  (`442b0ee`)

## [0.4.0] — 2026-07-08

### Added
- **M0 graduated:** `src/ralph.js` (the fixed dumb outer loop — arbiter + budget, stop at
  first green, cap-halt its own category, broken close escalates immediately without retry,
  gap fed back to the middle) and `src/spine.js` (append-only JSONL, seq monotonic, ts
  stamped last). stdlib only, token-free, outside all three libs by design.
- `tests/ralph.test.js` — 6 behavior tests over the public API covering the M0 exit
  criteria, including the negative case (a passing close goes green at iteration 1, so a
  shell hardwired to red fails the suite) and a recovery case (middle fixes the world at
  iteration 2 → green under the same cap).
- `poc/probe-01-ralph-noop.mjs` — the validating POC (PASS; kept as evidence, superseded by
  the rewrite per house rules).
- `package.json` — ESM, no dependencies, `npm test` via `node --test`.

## [0.3.0] — 2026-07-08

### Added
- `CLAUDE.md` — agent context: source-of-truth chain, adaptlearn doctrine distilled from the
  PRD, module ladder, dev-rules stub. (`4e59b97`)
- `docs/00-context/FINDINGS.md` — no-papering-over log, seeded with F1 (litectx already
  exports the Write·Select·Compress·Isolate ops vocabulary — schema v1 binds it, consume don't
  build) and F2 (bareagent `provider-clipipe` reports zero usage though the claude CLI emits
  it — upstream fix candidate; local runs cap on counts until then).
- `docs/plans/2026-07-08-schema-v1-design.md` — validated schema v1 design: hybrid knobs +
  3 hook slots (`before-attempt` / `after-red` / `on-green`, ≤2 ops each), loop menu
  `refine` | `plan`, 4-verb subset (`recall`, `compress`, `stash`, `remember` gated to
  on-green), one-JSON-path mutation rule, shell-owned provider with cap dimension matched to
  provider, M3 MAX/MIN contrast pair, named v2 candidates.

## [0.2.0] — 2026-07-08

### Changed
- PRD v1.1: one-knob mutation rule, green-gates/cost-ranks (never one fitness score),
  three-tier goals (improvement is nobody's goal), §5b red-attribution doctrine (five meanings
  of a red; meaning from contrast; reds never mint inheritance but steer mutation). (`e0cd360`)

## [0.1.0] — 2026-07-08

### Added
- PRD v1 (LOCKED) at `docs/01-product/adaptlearn-prd.md`: primary claim = cross-run adaptation
  with ungated-inheritance falsifier; harness artifact = constrained config (schema v1); task
  domain = relayfact's; three-layer shape (Ralph shell / emergent middle / stigmergic floor);
  module ladder M0–M6; $2 per-run cap, ~$50 ladder budget. Repo public from day one.
  (`47a87f5`)
