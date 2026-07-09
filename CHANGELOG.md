# Changelog

All notable changes to adaptlearn are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[SemVer](https://semver.org/) (0.y.z pre-release: minor = a ladder module or spec milestone,
patch = corrections). Versions before code exist are retroactive spec milestones.

## [Unreleased]

- M3: contrast check (MAX vs MIN opposed configs must differ measurably — the kill-switch)

## [0.6.0] — 2026-07-09

### Added
- **M2 graduated:** `src/interpret.js` — the only code that reads a config. Composes all three
  libs (litectx store + hooks, bareguard Gate with config writeScope/budget, tool-free
  bareagent Loop on a shell-owned provider); reds before tokens; loop.shape genuinely wired
  (plan = decompose call + implement call); config maxIterations/budgetUsd tighten the shell's
  caps, never exceed them; failure-map categories on the spine (config-red / cap-halt /
  gate-red / interpreter-red). `src/ralph.js` is now async and relays the thrower's category
  (dumb passthrough — Ralph never interprets).
- `poc/probe-02-interpreter.mjs` — the validating POC, run LIVE on local claude: real green in
  3 iterations (prose → syntax error → green, gap feedback working), config-red at zero
  tokens, and a 2-cent budget provably halting a $0.13 run as cap-halt (A1's costUsd feeding
  bareguard's USD axis).
- `tests/interpret.test.js` — 8 integration tests over a scripted stub provider (the
  provider is the legitimate seam: it's shell-owned by design); everything else real.
- `bareguard` file-dependency — all three libs now consumed.
- FINDINGS F3 (`onLlmResult` is a Loop constructor option; on `run()` silently ignored — budget
  goes blind) and F4 (schema globs vs bareguard prefix-containment writeScope; trailing `/**`
  mapped, mid-path wildcards inexpressible).

- `bare-agent` file-dependency; **A1 consumed** — clipipe `parse: 'claude-json'` verified live
  (mapped text/usage/model/costUsd; loud ProviderError on malformed output). FINDINGS F2
  resolved; M2 local runs will cap on real USD, not counts.
- `tests/ralph.test.js`: regression test proving the `NODE_TEST_CONTEXT` strip is load-bearing
  (a real failing `node --test` close reds under the runner; with the strip removed the test
  fails — mutation-checked). Closes the fake-green gap found in the AGENT_RULES audit.

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
