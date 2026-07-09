# Changelog

All notable changes to adaptlearn are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[SemVer](https://semver.org/) (0.y.z pre-release: minor = a ladder module or spec milestone,
patch = corrections). Versions before code exist are retroactive spec milestones.

## [Unreleased]

- M6: inheritance + selection (the claim; rules-vs-verbatim sub-experiment)

## [0.9.1] — 2026-07-09

### Changed
- **PRD v1.3 (explicit post-M5 amendment; claim/falsifier/shape/budget untouched):** doctrine
  earned by F5–F11 written in — sealed middle-side bindings (§2, from F8); mid-run arbiter
  immutability + interpreter-owned acceptance (§2, from M5); validator-mirrors-enforcement
  with harmony tests (§2, from F5+F9); verdict as the only claim-bearing categorical axis at
  small n (§5, from F7's 2×2); §7b registered M6 priors (memory-surfacing is the live axis;
  ~1/3 nonzero no-inheritance baseline; all middle-side spend counts; novelty-preferring
  one-knob mutation picker as mechanism-not-objective; known worker noise); §3.8 v2-registry
  pointer (`peek` trigger earned via F6); §7 budget actuals (~$8.5 through M5 → ~$41 for M6).
- **Revisor spend now metered by the run's own gate** (PRD §7b.3): `proposeRevision` accepts
  gate-wired `policy`/`onLlmResult`; the interpreter threads its own through and maps a
  mid-revision budget halt to cap-halt. Regression: an expensive revision halts the run
  BEFORE the iteration cap (77/77). Authorship stays shell-accounted (its gate doesn't exist
  yet at authoring time) — counted into cost-to-green per §7b.3.

## [0.9.0] — 2026-07-09

### Added
- **M5 graduated:** mid-run revision. `src/revise.js` (`proposeRevision` — one sealed shot,
  parse-only, config + catalog + stall evidence in, candidate out) + `src/interpret.js` gains
  an optional `revisor` seam: fires ONCE after `STALL_REDS` (2) consecutive close reds; the
  **interpreter owns acceptance** (re-validate; gate/escalation immutable → `arbiter-touch`;
  `loop.maxIterations` snapshotted → `cap-touch`; rejected candidates degrade loudly to
  `revision-red` and the run continues on the old config); accepted revisions swap the live
  config (`revision-accepted` + `changedPaths` on the spine).
- **M5 exit met** (probe-05): recovery **revision 3/3 vs control 1/3**, every green at the
  first post-revision attempt; empty-store falsifier 0/2 (revision works through the resource
  it surfaces, not the act of revising); token-free machinery negatives (arbiter-touch,
  garbage, no-stall) held before any live spend. ~$2.9. FINDINGS F11.
- `tests/interpret.test.js` +7 M5 cases (observable mid-run shape swap, lying-revisor
  rejection, cap-touch, validation red, parse red, control-arm semantics, no-stall silence);
  `tests/revise.test.js` (4 tests, parse-only contract + prompt-content guard). 75/75.

## [0.8.0] — 2026-07-09

### Added
- **M4 graduated:** `src/author.js` — the authorship layer. One sealed call (task + catalog
  only; never the close, never coaching), one shot, validated: invalid output is DATA
  (`{valid:false, reds}`), never a throw or a retry. `renderCatalog()` renders the config
  space bound to the validator's exported vocabulary and states the run contract (artifact
  under `src/`; shell cap echoed, not hardcoded).
- **M4 exit met** (probe-04 round 2): first-shot validity 3/3; parity **agent 3/3 green @1 vs
  hand 2/3** on the easy cohort (hand miss = honest cap-halt on worker syntax fumbles);
  fit-to-pass 0 by construction; ~$0.53 round. Authored configs were coherent and
  task-tailored (tighter budgets than the hand config, correct verb placement, all `refine`).
  FINDINGS F10; round-1 NO PARITY diagnosed and recorded in F9, superseded, not papered over.
- `tests/author.test.js` (8 tests, 64/64, stub provider): one-shot contract, fence-tolerant
  parse, parse-error-as-data, named reds surfaced with the parsed config, shell cap enforced
  against authored budgets, catalog↔validator vocabulary drift guard, run-contract regression,
  arbiter-fields-illegal warning present.

### Fixed
- **F9:** validator accepted `gate.writeScope` strings the enforcement layer cannot express
  (mid-path wildcards like `src/*.mjs` validated green, then gate-redded EVERY write at
  runtime — found by agent authorship in probe-04 round 1). Wildcards now legal only as a
  trailing `/**` or `/*`; distinct `invalid-value:gate.writeScope` red + `writescope-midglob`
  fixture.

## [0.7.2] — 2026-07-09

### Added
- **F7 falsifier run** (`poc/probe-03b-unseeded-control.mjs`): MAX config vs an EMPTY store,
  n=2, first-attempt convention compliance as the noise-robust metric. Unseeded MAX cap-halted
  4/4 in both runs with the exact MIN first-attempt signature (2 note-convention misses). Clean
  partition across all six live runs: recall-surfaced-seeds → green 2/2; nothing surfaced
  (empty store OR empty slots) → cap-halt 4/4. The recall→context channel is confirmed causal
  **by intervention**, and honestly narrowed: shape/slot mechanics alone rescued nothing —
  the demonstrably wired variable is memory-surfacing; expect shape mutations near-neutral in
  M6 on this task family. FINDINGS F7 updated.

## [0.7.1] — 2026-07-09

### Changed
- **A2 consumed** (same day): `REMEMBER_KINDS` now bound from litectx's new `WRITE_KINDS`
  export instead of hardcoded (F5 drift risk gone; v1 still gates `doc` out). Two harmony
  tests (56/56): every validator-legal remember kind must be accepted by litectx `remember()`
  at runtime, and `doc` stays a verb-params red here despite being legal upstream.
- FINDINGS F7: recorded the 2×2 reading of the two live runs — verdict stable within-config
  (MAX green 2/2, MIN cap-halt 2/2) while iterations-to-green varied 1→4 *within* MAX, so at
  n=1 the verdict axis (not iterations) is the load-bearing discriminator; MIN's whack-a-mole
  gap trail shows the harness converting iterations into verdict under a fixed cap.

## [0.7.0] — 2026-07-09

### Added
- **M3 passed — the kill-switch did not fire.** Live contrast run (`poc/probe-03-contrast.mjs`,
  local claude): the design doc's MAX/MIN pair (opposed on exactly 8 JSON paths, machine-checked;
  gate/escalation identical) on the same task/close/shell/pre-seeded store produced a
  **categorical difference on verdict** — MAX green @ 1 iteration (~$0.11, recall surfaced all 3
  seeded notes), MIN escalated as cap-halt @ 4/4 (~$0.99, close red throughout); **reproduced
  under the F8-sealed worker binding** (MAX green @ 4 ~$0.32 vs MIN cap-halt 4/4 ~$0.45). §5b:
  same task + worker + shell, different harness → harness implicated; the schema variable is
  wired in. FINDINGS F7 (tables, causal-channel evidence, honest bounds: n=1 task, joint axis).
- `tests/fixtures/contrast-{max,min}.json` + `tests/contrast.test.js` (4 tests, 54/54): the pair
  stays schema-legal, opposition stays exactly the designed 8 axes, arbiter-adjacent sections
  stay identical, MAX populates every slot / MIN none. The live result is evidence, not CI.
- FINDINGS F6: litectx `stash` is never recallable (works as intended upstream — "a dumb keyed
  blob"; `peek` is its only read-half and a named v2 exclusion), so v1's `stash` verb is
  write-only decoration — it can never influence worker context. Within-run memory axes are
  inert on a fresh store; contrast probes must pre-seed identically (simulated run-N retention).
  This is the finding that would re-admit `peek` in v2.
- FINDINGS F8: `claude -p` is the full CLI with tools — the worker wrote files in cwd **outside
  bareguard's gate** and loaded the repo's CLAUDE.md as context; gap text leaks the suite's
  path (fit-to-pass surface). Shipped result unaffected (verified, incl. a sealed re-run);
  binding now sealed shell-side: `cwd` pinned to an empty per-run sandbox +
  `--disallowedTools` on every tool. Doctrine for M4+: an unsealed CLI binding is a gate
  bypass, not a provider choice.

## [0.6.1] — 2026-07-09

### Fixed
- Negative-scenario audit closure (4 new tests, 50/50): on-green hook failure now degrades
  loudly (`retention-red` on the spine; the green stands — a retention hiccup must not corrupt
  the M6 learning curve, but that green mints no inheritance); cap tripping between plan and
  implement calls proven to read as cap-halt; validator garbage-type inputs (42/null/[]/true)
  proven parse-error-not-throw; **F5** — `remember.kind` narrowed to `fact|episode` (litectx
  `remember()` rejects `code`; the old check validated configs that crashed post-green).

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
