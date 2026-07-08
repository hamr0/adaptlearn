# Changelog

All notable changes to adaptlearn are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[SemVer](https://semver.org/) (0.y.z pre-release: minor = a ladder module or spec milestone,
patch = corrections). Versions before code exist are retroactive spec milestones.

## [Unreleased]

- M0: Ralph shell + JSONL spine (token-free; probe-01 shape — noop middle → red, cap halt,
  decision-ready escalation)

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
