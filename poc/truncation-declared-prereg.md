# POC pre-registration — is F21's attribution poisoning label-fixable? (declared truncation)

> **Status:** bareloop de-risk probe #3, run in the adaptlearn sandbox. NOT an adaptlearn result.
> Throwaway `poc/`; no PRD amendment; the archived record is unchanged.
> Predictions below are committed BEFORE any run (POC bar: outcomes reported, never asserted).

## Question

F21's mechanism finding: **partial retrieval poisons gap attribution** — the narrow-menu worker
took recall's 4/8 callers as the complete set and dismissed the 3 real failing tests as another
repo's noise (verbatim in the main-A-0 artifact). The retrieval block was a ranked top-k view
presented with **no declaration that it was truncated**.

The VSM variety audit (CYBERNETICS §5c) proposes the manifest rule: *every amplifier declares
its truncation* — ranked views must say "top-k of an unknown total, may be incomplete";
exhaustive views alone may claim exhaustiveness ("TRUNCATED, declared" as the injection-side
generalization of the ledger's "ABSENT, not fabricated"). Open question this probe decides:

**Is that rule load-bearing or hygiene?** I.e. does declaring the truncation restore correct
gap attribution in the narrow arm — or does attribution require structural-exhaustive verbs
(F21's admission answer), with the label changing nothing?

## Design (one knob: a declaration sentence — nothing else moves)

World: **F21 verbatim** (`formatLabel` + 8 committed caller modules; falsifier `parseThing`
leaf; same notes, same suites, same stubs, same references, same seeded store, cap 4, clipipe).
Menu: **narrow only** — `[recall]`, k=5, kinds [episode, code], bodies delivered — F21's A arm.
Instrument: **F22's fixed instrument** (last-fence `extractArtifact`; provider retry + 30s
backoff, second failure = provider-red, excluded from every read). This matters: F21's A-arm
iterations 2–4 were contaminated by the stripFences crack; this probe re-runs the narrow arm
with the crack closed, so iterations 2+ are readable for the first time.

Arms, one knob apart (the parenthetical; byte-asserted by a machinery negative):

- **U (undeclared, F21-A replication):** context block header
  `Possibly relevant notes:`
- **T (declared):** context block header
  `Possibly relevant notes (retrieved by ranked top-k search — an INCOMPLETE view: items beyond
  the top k are not shown; do not treat this list as exhaustive):`

The declaration is purely epistemic — it names the truncation and nothing else. It contains NO
strategy ("trust the failing tests", "look for more callers" would be coaching, a different
knob, and would rig the read).

Cells: {MAIN, FALSIFIER} × {U, T} × 3 reps = 12 sealed runs.

## The reads (pre-registered)

**Primary — attribution (the mechanism axis).** An observer-only per-test meter (TAP reporter,
never shown to any worker) reads each iteration's artifact. `gapOnly` = the {badge, price, qty}
tests — the three conventions recall structurally cannot surface (F21: iteration-1 red fails
exactly this set, deterministic 3/3). The iteration-2 artifact is the first one authored AFTER
the worker has seen a gap naming all three with expected/actual diffs, so:

- a MAIN cell is **ATTRIBUTED** iff ≥2 of the 3 gapOnly tests pass on its iteration-2 artifact
  (the worker adopted the close evidence instead of dismissing it);
- arm read: count of ATTRIBUTED cells, T vs U (strict count over 3 reps).
- Special cases: MAIN green@1 = guessability breach (F21 says impossible) — flagged, excluded
  from the attribution read; provider-red cells excluded from everything (§5b).

**Secondary — outcome.** greens / iterations-to-green, F21's encoded catBeats (X beats Y iff
more greens, or equal >0 greens and non-overlapping iteration ranges). F22 sharpened the bound
(one narrow-menu cell ground to green@4 under the fixed instrument), so U may occasionally
grind; the outcome read is secondary because cap-4 grinding is noisy where attribution is not.

**Falsifier guard.** On the leaf task recall surfaces everything needed (F21: both arms 3/3
green@1) and the declaration is content-inert. Required: FALSIFIER T ≈ U. If the arms differ
categorically in EITHER direction, the declaration is doing generic work (e.g. inducing
distrust of adequate context) and the MAIN read is void.

**Observational (reported, not read):** iteration-1 gapOnly must be 0/3 both arms (the
declaration adds no conventions — if T@1 differs, something leaked); persona-break frequency
(F21 saw prose spirals only in the narrow arm — now survivable, so countable).

## Pre-registered outcomes

- **LABEL-FIXES:** MAIN ATTRIBUTED count T > U **AND** falsifier T ≈ U.
  → "every amplifier declares its truncation" is LOAD-BEARING; bareloop prompt assembly adopts
  it as a rule (ranked views always declare; only exhaustive views may claim exhaustiveness).
  Note what this does NOT change: F21's admission verdict stands — the wide menu still buys
  green@1 certainty; the label buys honest attribution where the menu is narrow.
- **LABEL-INSUFFICIENT (null):** MAIN ATTRIBUTED T ≈ U (poisoning persists under declaration).
  → attribution is only fixed structurally (exhaustive verbs, F21's registry); the manifest
  rule is demoted to hygiene — kept for honesty, never relied on for attribution. A finding,
  not a tweak.
- **CONFOUND:** FALSIFIER arms differ categorically.
  → the declaration has generic (non-informational) effects; no clean read on the attribution
  channel from this design. Investigate before believing anything.

## Machinery negatives (measured token-free before any spend; each must be able to FAIL)

1. Stubs red both suites; references green both suites (close sanity).
2. `impact('formatLabel')` = 8/8 callers (world fidelity to F21); recall k=5 < 8 callers (the
   insufficiency is real); `impact('parseThing')` empty (falsifier inert).
3. One-knob byte assert: T's assembled context equals U's with exactly the declaration
   parenthetical inserted — on both tasks.
4. The meter can fail: reference artifact metered 8/8 (gapOnly 3/3); stub metered gapOnly 0/3;
   a hand-built partial artifact (everything BUT the gapOnly conventions) meters exactly 5/8
   with gapOnly 0/3.
5. The premise "the gap names all three" is MEASURED: the runClose gap slice for the partial
   artifact of (4) must contain all three failing test names within the 2000-char slice.
6. Falsifier surfaceability: recall on the leaf task returns both parseThing convention notes.
7. `extractArtifact` handles the F21 crack (mid-prose fence → code only; bare code passes).

## Run plan

3 reps/cell × 4 cells, sequential; provider = clipipe (local claude, subscription); REPS/cap
env-tunable but registered at 3/4. Expected wall-clock 30–90 min. Evidence: world dir +
per-cell spines + per-iteration artifacts + meters JSONL, archived under
`docs/archive/evidence/` on completion, results appended here either way.

## Results (2026-07-12, run complete — evidence: `docs/archive/evidence/truncation-declared-E1wCrp/`, live world /tmp/probe-trunc-E1wCrp)

Machinery negatives all green token-free (twice: `--negatives-only` then live preamble).
12/12 cells readable — two provider timeouts absorbed by the retry seam, zero exclusions.

**Read: NULL (LABEL-INSUFFICIENT fired) — but in the null's OTHER shape.** The pre-registered
categorical check (ATTRIBUTED count T > U) is false: **U 3/3 attributed@2, T 3/3
attributed@2**. The runner's canned null text ("the poisoning persists under declaration")
assumed the only null path was poisoning-in-both-arms; the data took the second path this
prereg failed to word: **the poisoning did not reproduce in EITHER arm.** The machine-checked
category stands (the declaration is NOT load-bearing — there was nothing for it to fix); the
mechanism sentence printed by the runner is wrong for this data and is corrected here.

- MAIN outcome: U 0/3 green (3× cap-halt@4) | T 0/3 green (3× cap-halt@4) — F21's narrow-arm
  bound replicated under the fixed instrument (narrow now 0/9 pooled across F21+here vs wide
  3/3 green@1 F21-C + 3/3 green@1 F22-D1; the standing exhaustive reference arm is F21-C,
  not re-spent).
- FALSIFIER: U 3/3 green@1 | T 3/3 green@1 — guard clean, no confound, declaration does no
  generic work.
- iteration-1 gapOnly: 0/3 everywhere (no leak; the declaration adds no conventions).
- Attribution trails (from the on-spine meters): every MAIN cell passed ≥2/3 gapOnly tests at
  iteration 2; several then REGRESSED (3/3→2/3, or total 5/8→4/8), one collapsed to a broken
  artifact. No artifact in any cell contains F21-style dismissal prose (grep across all 24
  main artifacts: zero hits). The sharpest counter-example is main-U-0's iteration-2 artifact
  — the UNDECLARED worker annotates each convention "verified" (from the gap diff) vs
  "INFERRED from the test title, exact input/output truncated": the worker declares its own
  evidence truncation unprompted.

**Retro-read of F21's mechanism finding (the honest cost of this probe):** the
attribution-poisoning "gem" — partial retrieval ⇒ false completeness ⇒ true close evidence
dismissed — **does not replicate under the fixed instrument** (0/6 narrow-arm cells here vs
the single F21 cell it was read from, whose verbatim evidence lived in the
stripFences-contaminated iterations). Same lesson F22 taught with lock-discrimination,
one level down: a single-CELL sub-finding, especially one harvested from a contaminated
region, doesn't get designed around. F21's HEADLINE is untouched — the menu axis is wired-in
and the contrast replicated here again; what falls is only the poisoning mechanism story.

**What the narrow arm's failure actually looks like (observational, offered not asserted):**
hunting, not dismissal (CYBERNETICS, Wiener). Attribution succeeds at iteration 2 (~4-5/8
total), then oscillates — fixing gap conventions breaks previously-passing ones under a
partial caller view; cap-4 halts mid-oscillation. The wide menu's value re-reads accordingly:
not (only) preventing misattribution but delivering the WHOLE constraint set at once so
convergence is possible at iteration 1.

**Residual instrument finding (revalidates the artifact-red port note):** main-U-1 iteration 3
replied with prose + UNFENCED code; last-fence extraction has no fence to take and passes the
whole reply through → SyntaxError artifact → the close reds on "artifact invalid" while
meaning "code wrong". Extraction improvements cannot close this class — a non-code artifact
needs its own red category (artifact-red), exactly as F21's port note said. Persona breaks
concentrated in the info-starved MAIN arms (U 4, T 7, falsifier 1) — direction consistent
with F21's observation, small-n, no claim.

**Consequence for bareloop PRD v1.6 commitment #5 (the gate, both directions honored):** no
separation → the full amplifier rule ("every partial view declares itself partial") does
NOT enter. The floor survives — ranked views never claim exhaustiveness; exhaustive views
may — but its evidence citation must be corrected: the floor now rests on honesty/manifest
grounds (the injection-side symmetry of the ledger's ABSENT-not-fabricated), NOT on a
demonstrated attribution-poisoning mechanism. Filed as F23; consumed by the bareloop session.
