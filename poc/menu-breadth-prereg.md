# POC pre-registration — is menu breadth a wired-in contrast variable?

> **Status:** bareloop de-risk probe, run in the adaptlearn sandbox. NOT an adaptlearn result.
> Throwaway `poc/`; no version bump, no PRD amendment, no cohort arm; tagged record stays at v0.11.1.
> Predictions below are committed BEFORE any run (POC bar: outcomes reported, never asserted).

## Question

bareloop decision #3 discloses a primitive menu and admits verbs per job. Open question:
is **menu breadth** a wired-in contrast variable — does admitting one more *callable* primitive
change outcome — or is it decoration? M3 kill-switch logic, applied to menu size: two opposed
menus must differ measurably on ≥1 task, else the variable isn't wired → skip the registry.

## Why `impact`, not a memory verb

`impact(symbol, dir='in')` = exhaustive structural enumeration of a symbol's callers over an
indexed store. Relevance is **structural and binary** (callers exist or don't) — it cannot be
made load-bearing by tuning the base menu, so the base menu can't be secretly crippled to force
a gap. A memory verb (`assemble`/`peek`) trades off against `recall.k`/`compressLevel`; making it
matter requires setting the base just-insufficient, which is itself the rig. `impact` closes that
surface at the root, and mirrors job #1 (repo maintainer: "who calls this" is unguessable,
recall-can't-exhaustively-enumerate knowledge).

## Design (2 tasks × 2 menus, one-knob apart)

**Menus** — identical except one op:
- **A (narrow):** `before-attempt: [{op: recall, k: 5}]`
- **C (wide):**   `before-attempt: [{op: recall, k: 5}, {op: impact, dir: 'in'}]`  — `diffPaths(A,C)==1`

Worker is tool-free: the interpreter runs the hook ops and injects the result into context. C
injects the exhaustive caller set; A injects only semantic top-k recall. (Admitting `impact` =
teaching interpret.js to dispatch it — the admission mechanism the bareloop registry prototypes.)

**MAIN task — `impact` has purchase.** Implement `format.mjs` exporting `formatLabel(item)`.
The indexed store already holds **8 caller modules** that import and call `formatLabel` with
different option shapes; the suite is the union of their pinned expectations. The task statement
UNDERSTATES this ("format an item label") — same info-gap family as M6/F7. `recall.k=5`
(schema default, untouched) structurally cannot enumerate all 8 callers in one shot; `impact`
returns all 8. The gap is intrinsic ranked-top-k vs exhaustive-structural, NOT a tuned k.

**FALSIFIER task — `impact` is inert.** Implement `leaf.mjs` exporting `parseThing(str)`, a
self-contained parser with NO callers in the store; its edge rules live in seeded notes
(recall-surfaceable). `impact('parseThing','in')` → empty. Same info-gap style, but nothing for
`impact` to contribute.

## Machinery negatives (printed before any live spend — measured, not assumed)

1. reference `formatLabel` greens the union suite (close sanity).
2. `impact('formatLabel','in')` returns the 8 seeded caller sites (verb works on indexed seed).
3. `recall("formatLabel", k=5)` returns < 8 caller sites (the insufficiency is REAL).
4. `impact('parseThing','in')` returns empty (falsifier inertness confirmed).

## Pre-registered reading (categorical only — verdict or iterations-to-green; cost is 10× noisy)

- **WIRED-IN:** MAIN C beats A categorically **AND** FALSIFIER C ≈ A.
  → menu breadth is wired → bareloop builds the admission registry.
- **DECORATION (null):** MAIN C ≈ A.
  → the extra primitive doesn't move outcome even where it should → bareloop admits a fixed base
    set, skips the registry. A finding, not a tweak.
- **CONFOUND (kills the read):** FALSIFIER C > A.
  → the gap isn't `impact`'s relevance (mere op presence moved something) → investigate before
    believing any MAIN gap.

## Deferred (named, not silently dropped)

- **B (disclosed-but-locked):** `impact` listed to the author but not dispatched → request-red on
  use. Isolates the disclosure-prompt channel from capability (§4b). The keystone here is A-vs-C;
  B is the immediate follow-up once A-vs-C reads WIRED.
- Selection actually *discovering* which verb to admit (that's a cohort, not this kill-switch).

## Grounded amendments (2026-07-11, still pre-spend — from reading the real contracts)

1. **Fix-task reframe.** `litectx.impact(symbol)` returns `null` unless the symbol is *defined in
   the index* — so both tasks become **fix** tasks: the target exists as a failing naive stub the
   worker rewrites. (Also closer to job #1's maintainer shape than greenfield synthesis.)
2. **The impact op composes `impact()` + `get(callerPath)`.** `Impact.callers` are pointers
   (`path`,`line`), not bodies; litectx's own fetch-toll doctrine names `get` the body-access
   counterpart of a pointer-returning verb. A's recall op gets identical body treatment
   (`body: true` / `get` fallback), so BOTH arms deliver content — the one knob is the *selector*:
   ranked top-k vs structural-exhaustive.
3. **One world template for both tasks.** MAIN's target (`format.mjs` + 8 callers) and
   FALSIFIER's (`leaf.mjs`, zero callers) live in the same furniture; notes (falsifier
   conventions + M6-style decoys) identical across all cells. Only task/suite/symbol differ.
4. **Categorical read, encoded:** arm X beats Y iff `X.greens > Y.greens`, or greens equal (>0)
   and `max(X.iterationsToGreen) < min(Y.iterationsToGreen)` (non-overlapping). "≈" = neither
   beats. Machine-checked, not eyeballed.
5. **Schema v1 stays closed.** The validator correctly rejects `impact` (named v2 exclusion), so
   op dispatch is POC-local in the probe — a prototype of the bareloop admission registry, not a
   widening of the archived schema. Graduated `src/` untouched.

## Run plan

3 reps/cell × 4 cells (MAIN×{A,C}, FALSIFIER×{A,C}), provider = clipipe (zero marginal, `counts`
dimension), cost unit = iterations-to-green per schema decision 7. Store seeded + indexed once,
identical for all cells. Reference greens its suite before spend.

## Results (2026-07-11, run complete — evidence: `docs/archive/evidence/menu-breadth-rpcu95/`, live world was /tmp/probe-menu-rpcu95)

Machinery negatives all green before spend (stubs red, references green, impact 8/8 callers,
recall 4/8, A/C one-block contrast). One found-live instrument bug pre-spend: a bare `git init`
blinds litectx `collectFiles` (`git ls-files` on a commit-less repo → empty) — worlds must have
seed files committed.

**Read: WIRED-IN.** MAIN: A 0/3 (3× cap-halt@4) vs C 3/3 green@1. FALSIFIER: A 3/3 green@1 ≈
C 3/3 green@1 (impact op fired, inert form). No confound. → bareloop builds the admission
registry (disclosure → request-red → admit). B-arm (disclosed-but-locked) is the registered
follow-up, in bareloop.

**Cleanest cut — iteration 1, uncontaminated (real code, both arms, all reps):** C green@1 3/3;
A red@1 3/3 failing exactly {badge, price, qty} — the callers recall did not surface.

**Mechanism finding (unexpected):** partial retrieval poisons gap attribution. The A worker took
recall's 4 callers as the complete set and dismissed the 3 real failing tests as another repo's
noise (verbatim in main-A-0's final artifact). Ranked top-k ⇒ false completeness ⇒ close
evidence discarded. Structural-exhaustive verbs don't just add context; they prevent evidence
misattribution (worker-side rhyme of F16's "verdict admits, contrast attributes").

**Instrument caveat (honest bound):** A iterations 2–4 contaminated — worker persona break
(prose + mid-text fence), stripFences passed prose to the artifact → SyntaxError gaps replaced
test feedback. "A can never green at cap 4" is NOT established; the @1 contrast and 0/3-at-cap
under this instrument are. bareloop port notes: (1) non-code artifacts should red as their own
category (artifact-red), not corrupt the close signal; (2) interpret.js stripFences shares the
weakness (port note only — repo closed at v0.11.1).
