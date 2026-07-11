# Changelog

All notable changes to adaptlearn are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[SemVer](https://semver.org/) (0.y.z pre-release: minor = a ladder module or spec milestone,
patch = corrections). Versions before code exist are retroactive spec milestones.

## [Unreleased]

(nothing — the record is closed; successor work lands in the bareloop repo. 0.11.2/0.11.3 are
the registered exceptions: bareloop de-risk probes run in this sandbox because the machinery
and evidence conventions live here.)

## [0.11.4] — 2026-07-11 — upstream-ledger feature spec + reference implementation (bareloop-destined)

### Added
- **`docs/plans/2026-07-11-upstream-ledger-design.md`** — reactive lib/primitive incident
  monitoring, the A1/A2/A3 upstream-ask flow mechanized: 8 incident classes derived from the
  spines (provider-red, runtime-red, silent-degradation via per-job `primitive-smoke`
  known-answer events, capability-gap = request-red ∧ cap-halt, …), deduplicated by
  `lib:verb:class:normalized-signature` into one append-only JSONL both consumers (workflow
  debugging) and the maintainer (upstream fixes) read; status lifecycle
  open→filed→fixed→consumed, human-appended — filing stays human. Close reds and bare
  cap-halts are deliberate exclusions (workflow stories, never lib bugs).
- **`poc/upstream-ledger.mjs`** — stdlib-only reference collector (selftest 8/8 incl. two
  must-produce-nothing negatives; the dedupe fixture caught a real normalization bug).
  Validated against the archived F21/F22 spines: re-derived this session's true incident
  history (provider crash ×3 as ONE incident, timeout as a distinct signature,
  capability-gap:impact ×3, request-red:impact ×15) with zero false positives from ~100
  close reds. Idempotent re-runs; ledger reconstructible from spines.

## [0.11.3] — 2026-07-11 — bareloop de-risk probe #2: menu disclosure (F22) — record unchanged

### Added
- **F22** — menu-disclosure probe (F21's registered B-arm + author selection + ask channel),
  pre-registered in `poc/menu-disclosure-prereg.md`. Keystone: **the admission chain proves
  end-to-end** — author selects `impact` from the disclosed menu → dispatch injects callers →
  **3/3 green@1** (vs D0 baseline 1/3@[4]). Author selection is **cargo-cult** (grabs the verb
  6/6 on the inert task too, both worlds); run 1's "lock creates discrimination" **did not
  replicate** (downgraded — asks are alive but not need-weighted); the §4b disclosure-leak
  concern is **unsupported** (fired opposite-direction, no config compensation). Bonus:
  within-run request-red frequency (4/run) is a free, structured need signal; one D0
  grind-green@4 sharpens F21's bound — the wide menu buys first-try *certainty* (cost axis),
  not raw possibility.
- **`poc/probe-menu-disclosure.mjs`** + **`poc/menu-disclosure-prereg.md`** — runner (author
  layer via stock renderCatalog + POC-local catalog conditions and impact dispatch; schema v1
  closed, `src/` untouched) and the self-contained prereg → run-1 postmortem → run-2 results.
- **`docs/archive/evidence/menu-disclosure-RuUllB/`** (run 2, complete: authored configs,
  spines, artifacts, console log) and **`menu-disclosure-hhD2yp/`** (run 1: runs VOID on two
  instrument failures — op-composition clobber, provider crashes — kept for the postmortem;
  authoring cells load-bearing).
- PRD **v1.5.7** record note (pointer only; the closure stands).

## [0.11.2] — 2026-07-11 — bareloop de-risk probe: menu breadth (F21) — record unchanged

The experiment's claim, falsifier, and archive verdict are untouched; this release only adds
successor-track probe evidence, F20-style.

### Added
- **F21** — menu-breadth kill-switch (bareloop design decision #3): pre-registered
  (`poc/menu-breadth-prereg.md`), 12 runs, read **WIRED-IN** — A=[recall] 0/3 cap-halt@4 vs
  C=[recall,impact] 3/3 green@1 where impact has purchase; identical 3/3 green@1 both arms
  where it is inert (falsifier clean, no op-presence confound). Consequence: bareloop builds
  the admission registry. Mechanism finding: ranked top-k retrieval **poisoned gap
  attribution** (the narrow arm dismissed real failing tests as another repo's noise) —
  exhaustive structural verbs prevent evidence misattribution, not just add context.
- **`poc/probe-menu-breadth.mjs`** + **`poc/menu-breadth-prereg.md`** — the runner (POC-local
  `impact` dispatch; schema v1 stays closed, `src/` untouched) and the self-contained
  prereg→results record.
- **`docs/archive/evidence/menu-breadth-rpcu95/`** — per-cell spines + final artifacts.
- **UPSTREAM-ASKS A3** (litectx): `index()` is silent when `git ls-files` returns empty in a
  commit-less repo — a silently blind index (found live by a machinery negative, token-free).
- PRD **v1.5.6** record note (pointer only; the v1.5.5 closure stands).

## [0.11.1] — 2026-07-10 — evidence preserved in-repo

### Added
- **`docs/archive/evidence/`** — every cohort world's load-bearing evidence copied out of
  `/tmp` before it could vanish: ledgers, cohort-results, condition stamps, configs
  (as-authored), configs-final (as-executed), extracted rules, and all per-cell spines, for
  attempt 2 (`dQtNOb`), attempt 3 + its outage-halted first world (`7xErzP`, `uTY3nt`),
  SP-1 (`aSqtvl`), SP-3 (`ap1exS`), F19 (`K9Ofzk`), F20 (`vVsQda`), plus one aborted start.
  README there maps world → findings. Attempt-3 console log archived alongside.
- **`poc/analyze-grid.mjs`** and **`poc/analyze-contrast-bits.mjs`** — the F18 acquisition
  lens (V6 mechanism classes) and the V2 attribution-bit counter, parameterized to run
  against live worlds or the archived copies; both verified to reproduce the filed numbers
  from the archive.
- FINDINGS header note pointing `/tmp` evidence citations at the in-repo archive.

## [0.11.0] — 2026-07-10 — VINDICATION RELEASE (post-archive probes complete)

Also in this release: README epilogue (the post-archive story, F16–F20); successor design
doc final amendments (run-as-executed inheritance, gate stance, attribution, V3–V6);
**successor seed PRD** at `docs/01-product/successor-product-prd-draft.md` — the starting
document for the new repo (claim, design laws, verdict classes, job #1, N0–N6 ladder).

**The archived claim was masked, not false.** The post-archive probe track (SP-1 → SP-3 →
F18 re-read → F19/F20) identified the masker that saturated every M6 cohort — **in-run
acquisition**: M5 mid-run revision reaching the seeded store gave every arm run-time access
to the regularities, so the run-level verdict could never separate cross-run inheritance.
F15's "worker prior" and F16's "guessability" were two misattributions of this one mechanism,
produced by a config-as-authored analysis lens blind to revision. On the first valid
instrument (F19: revision off × idiosyncratic conventions), **verdict-gated inheritance beat
ungated categorically: late green 1.00 (both gated arms) vs 0.13** — commitment (d) fired.
The archive verdict stands (correct on its evidence); this release annotates it. F20 passed
the successor's kill-switch: run-as-executed inheritance transmitted in-run acquisitions to
6/6 lineages across the exact generation boundary where F16 watched credit die, halving
cohort cost. The record is closed twice over; the successor's core mechanism is de-risked.

### Added
- **F19 + F20 results (PRD v1.5.5 — the claim expresses; the record closes twice over):**
  F19 attempt 4 ($8.29): P1 ∧ P2 ∧ P3, commitment (d) fires — on the first valid instrument,
  gated inheritance beat ungated categorically (late 1.00 both gated arms vs 0.13 ungated,
  gap +0.87); the archived claim was masked, not false; archive verdict stands, annotated.
  F20 successor POC #1 ($7.03): kill-switch PASSES — run-as-executed inheritance transmitted
  g0 acquisitions to 6/6 lineages at g1 (the exact F16 credit-loss boundary), cohort cost
  halved; gate discriminator did not fire in 8 gens (successor leans on verdict classes +
  attribution per the registered commitment; fit-to-pass risk deferred, not refuted).
- **F19 attempt-4 + F20 successor-POC pre-registrations, with machinery:** `--no-revision`
  launcher flag (F19: revision off → cross-run search is the only discovery path; the §1
  gated-vs-ungated claim finally gets a valid instrument) and `--inherit executed` (F20:
  run-as-executed inheritance — new `config-final` spine event in interpret, `inherit` option
  in runCohort, per-cell configs-final/ persistence for resume). Declared instrument fix: the
  `memory.recall.kinds` mutation axis is now grow-first (shrink-first made a missing kind
  unreachable from any multi-kind parent — F13's mirror, V5 pre-flight applied). Both
  conditions stamped in condition.json; resume refuses mismatches. Tests 122/122.
- **F18 addendum (zero tokens):** attempt-2 world re-read under the acquisition lens — all 52
  greens blind (close-teaching), confirming F14 as a real, distinct masker. V2 retro-count:
  the episode-knob contrast bit was ledger-visible in 16/16 generations of SP-1 + SP-3 with
  perfect green@1 separation — the credit gap is extractor-visibility, never missing signal.
- **SP-3 results + retroactive re-read (F17 results, F18, PRD v1.5.4):** SP-3 complete
  ($12.93). Q1 held (fixed 16/16 green@1, $0.030); Q2 failed as written; the pre-registered
  V1 leak search identified the real masker — **in-run acquisition via M5 revision + seeded
  store** (2/64 genuinely blind greens; every other blind-arm green shows
  stall → revise-to-episode-recall → green@3 in the spine). Same lens applied free to the
  SP-1 and attempt-3 worlds on disk: dominant mechanism there too (1/38, 5/29 blind) — F15
  "worker prior" and F16 "guessability" were misattributions from a config-as-authored
  analysis lens blind to revision. Q3 retention clause HELD (gated-rules L0 codified
  episode-recall at g3, retained 5/5 at ~8× under acquisition cost; retention is free where
  the knob is load-bearing). F18 design law: inherit/extract from the run-as-executed, never
  the run-as-authored, still verdict-gated. Probe track closed; no SP-3b.
- **Cybernetics frame** (`docs/00-context/CYBERNETICS.md`, PRD v1.5.3, F17 addendum):
  the experiment's earned doctrine mapped onto Wiener/Ashby/Conant/Beer/von Foerster —
  requisite variety = the F16 guessability result; Conant–Ashby predicts F17's Q2 (registered
  pre-readout at g7, with a leak-search-first reading order); credit-attribution gap =
  feedback-channel capacity ("verdict admits, contrast attributes" becomes a countable
  ≥1-contrast-bit-per-knob budget); algedonic escalation path; lineage keys per declared
  channel condition. Six V-items registered for the successor; no claim or verdict touched.
- **SP-1 successor probe (F16, pre-registered, running):** `--worker-model` launcher knob pins
  the WORKER's model only (author/extract/revisor stay on the CLI default); `condition.json`
  stamped per world, resume refuses condition mismatches. Tests the §7d boundary map with a
  haiku worker: P1 competence floor / P2 mask lifts / P3 gate separates, with the symmetric
  commitment (P1 ∧ ¬P3 ⇒ boundary map wrong as stated).
- **SP-2 API smoke** (`poc/sp2-api-smoke.mjs`): sealed worker on AnthropicProvider instead of
  the claude CLI — de-risks the product's "your APIs or local LLMs" promise and exercises the
  bareagent provider seam under the gate (cost metering path). API-only per hamr; local LLMs
  deferred.
- **Successor product design record**
  (`docs/plans/2026-07-10-agentic-automation-successor-design.md`): automate
  repeated/long/verifiable jobs with agent-authored, verdict-gated, both-ways-evolving
  scaffolding. Key decisions: three verdict classes (hard/soft/HITL green) gated PER STEP;
  primitive menu with removal as first-class mutation; new repo after SP-1; job #1 =
  auto-maintainer on litectx (review → fix → branch → PR → HITL merge). PRD carries a v1.5.1
  continuation pointer; the archive verdict is not reopened.

- **SP-1 results (F16): the symmetric commitment fired — boundary map rewritten.** Haiku
  worker, $10.70, complete: P1 held (fixed arm 1.00 green at $0.046 — haiku follows recalled
  conventions), P2/P3 failed (blind configs greened 0.80 ≈ opus's 0.73; gate did not separate).
  §7d's map is superseded: the masking variable is regularity GUESSABILITY (iterative reach at
  the retry cap), not worker capability. NEW credit-attribution finding: gated-rules authored
  the winning feature at g0, greened with it, and LOST it by g1 — bare greens carry no signal
  about which knob earned them. Design law for the successor: verdict admits, contrast
  attributes (the extractor must see a run's standing among siblings, never a bare green).
- **SP-2 results: API worker seam PASSES** — worker on AnthropicProvider with per-call cost
  metered and gate-visible; cap-halt and invalid-key paths escalate cleanly. Addendum
  (n=3): provider-path NON-INVARIANCE — same model, same config, notes verifiably surfaced;
  CLI-delivered haiku applies them, raw-API haiku does not (suspects: the CLI's system
  scaffold; flattened vs structured messages). Lineages must key per (job × worker path).
- **SP-3 guessability probe (F17, pre-registered, ready):** `poc/sp3-tasks.mjs` + `--task-set
  sp3` — same eight function shapes, every convention IDIOSYNCRATIC (128ms tick unit,
  middle-dot bytes, descending ranges, Swiss-apostrophe money with trailing-DR negatives,
  appended-zero color shorthand, dotted lowercase initials …); notes are the only path. Q1
  floor / Q2 blind collapse ≤0.25 / Q3 discovery LOCKS, with three symmetric commitments
  including both honest kills (map wrong again; attribution gap deeper than F16's account).

### Changed
- **Consumed upstream bareagent clipipe fix** (settle-guaranteed `_spawn`, stdout-tail error
  detail, loud onChunk) — both halves were adaptlearn field findings (F13/F15 addenda), fixed
  in bareagent per consume-don't-paper, picked up automatically via the `file:` dependency.

## [0.10.0] — 2026-07-10 — ARCHIVE RELEASE

**The ladder is closed: ARCHIVED** (PRD v1.5 §7d, F15). Attempt 3 ran under the declared
opaque close and the pre-registered commitment fired — the verdict gate does not separate on
the claim axis with the leak closed (gated-verbatim late 0.75 vs ungated 0.88; gated-rules
0.88 ties ungated). The mechanism was demonstrated end-to-end twice (episode-recall green@1
0.80 vs 0.00 in 44; gated-rules L1: discover → gate → codify → transmit → first-try greens at
~10× lower cost), but it expresses on efficiency — an axis this project's own rules bar from
carrying claims. Boundary map: verdict-gated harness inheritance is masked wherever the
environment's hidden regularities lie within the worker's guessing reach at the given cap;
the regime where it could express is weaker workers, tighter caps, harder-to-guess
regularities. That successor experiment is not this one.

### Added
- **M6 machinery (design → steps 1–5):** `src/mutate.js` (one-knob catalog + novelty-preferring
  picker), `src/cohort.js` (4-arm × 2-lineage generation loop, injected middle, budget stop,
  all-red HITL tripwire), `src/extract.js` (sealed rules extractor, reject-whole bounds),
  `poc/m6-tasks.mjs` (8 info-gap instances with reference impls + token-free `--check`),
  `poc/run-m6-cohort.mjs` (live launcher: outage escalation, watchdog on every sealed call,
  hash-verified `--resume` replay — used in anger, 48 rows replayed free).
- **Probe-06 PASSED (F12):** the inheritance channel is wired — rules steer authored configs
  both directions (falsifier 5.00 vs 0.00); the verdict gate is the only filter on content.
- **`poc/m6-opaque-close.mjs` (attempt 3, F15):** close reports pass/fail counts only; the
  launcher's `closeArgv` swap is the sole condition change vs attempt 2; `--check` asserts
  opacity of the red-path gap text.

### Changed
- **PRD v1.4 (claim/falsifier/budget untouched):** §4b instrument-channel doctrine — every
  information path into the worker is part of the instrument; close verbosity is a declared
  condition (earned twice: authoring channel F13, close channel F14). §7c results record:
  attempt-1 ceiling (instrument invalid), attempt-2 NULL on the claim axis with the mechanism
  numbers (episode-recall green@1 0.56 vs 0.00 in 38; gated-rules L1 ran discover → gate →
  codify → transmit end-to-end at ~⅓ cost), superseded ~⅓ baseline prior (per-close-verbosity
  from now on), the two pre-registered doors, and the dated door-(b) decision (F15).
- **M6 launcher hardening (F13):** broken-middle outages escalate to the operator instead of
  minting rows or crashing; $0 interpreter-red outage signature prompts before a row is
  written; hung revisor degrades to revision-red while gate HaltError stays cap-halt.

### Findings
- F12 (channel wired), F13 (attempt-1 ceiling + outage classes + store-furniture amendment,
  addendum: upstream clipipe unsettled-promise suspicion), F14 (attempt-2 null; informative
  close is an unregistered teaching channel; full mechanism demonstrated in one lineage),
  F15 (attempt-3 pre-registration, outage addendum + second upstream clipipe gap
  [stderr-only error text], results: mechanism separates perfectly / gate still null, verdict:
  ARCHIVE).

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
