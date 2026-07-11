# POC pre-registration — menu disclosure: the B-arm, author selection, and the ask channel

> **Status:** bareloop de-risk probe #2, run in the adaptlearn sandbox (F21's registered
> follow-up, folded together with author-side selection — both need the authorship layer).
> NOT an adaptlearn result; record stays closed (v1.5.6 pointer doctrine). Predictions
> committed BEFORE any spend.

## Questions (three, one probe)

F21 proved the menu axis is wired when the SHELL admits the verb. bareloop's real flow is an
AUTHOR choosing ops from a disclosed menu, with locked verbs requestable (decision #3). Left
open, plus hamr's tiering question (primary/secondary staged disclosure):

- **Q1 — discrimination (the tiering question, made empirical).** Shown the wide menu with
  `impact` admitted, do authors select it where it's load-bearing (MAIN) and skip it where
  it's inert (LEAF)? Tiered/staged disclosure earns its complexity ONLY if authors fail to
  discriminate (grab everything, or miss the needed verb). If they discriminate, flat
  disclosure is fine and primary/secondary is decoration.
- **Q2 — the ask channel.** With `impact` listed-but-LOCKED, do authors still include it
  (→ structured request-red)? The admission registry's input signal is exactly this ask. If
  authors never ask, staged disclosure cannot be unlock-by-request and must be
  unlock-by-failure-evidence (stall/cap-halt steering, §5b).
- **Q3 — disclosure leak (§4b, the registered B-arm).** Does LISTING a verb without
  capability change outcome? D2's runs must match D0's categorically. Named legal leak path,
  registered up front: a D2 author, tipped by the catalog line that caller-enumeration exists,
  may compensate WITHIN schema (recall kinds ["code"], k→20) — in this small world k=20 can
  approach exhaustive. That is §4b live (the catalog is an information channel into the
  instrument). Attribution is by CONFIG CONTENT, which we hold for every cell: outcome deltas
  are read conditional on authored recall params, never bare.

## Conditions (one axis: how `impact` is disclosed to the author)

- **D0 — absent:** stock M4 catalog (renderCatalog, unchanged). Baseline.
- **D1 — admitted:** catalog + one neutral op line (no strategy advice, house invariant):
  impact = "enumerate every module in the repo that calls the task's target function,
  injecting their code into the worker's context (before-attempt only)". Selected → dispatched
  (F21's composed impact+get).
- **D2 — locked:** same line + "LOCKED for this job: a config that includes it stays valid,
  but the op is skipped at runtime and recorded as a request." Selected → request-red event on
  the spine, op skipped, run continues.

Worker layer identical across conditions; the ONLY difference is catalog text (and D1's
dispatch when selected). Schema v1 stays closed: authored configs are validated by the stock
validator AFTER impact ops are stripped-and-counted (POC-local acceptance; the stripped count
is the selection/ask datum). Impact legal in before-attempt only; elsewhere = counted, noted,
still stripped.

## Cells

- **Authoring:** {D0, D1, D2} × {MAIN, LEAF} × 3 reps = 18 sealed one-shot author calls
  (M4 doctrine: authored-invalid is a result at zero worker tokens, never a re-ask).
- **Runs:** MAIN only, each authoring rep's own config: {D0, D1, D2} × 3 = 9 runs, cap 4.
  LEAF runs add nothing (F21: both arms green@1 regardless); LEAF is authoring-only, for Q1
  discrimination. Authored-invalid → that run cell records 'authored-invalid'.

World, tasks, suites, notes: F21's verbatim (copied, since probe-menu-breadth.mjs is frozen
evidence). Provider clipipe, sealed, cap 4, counts dimension.

**Instrument improvement over F21 (both/all conditions, registered):** artifact extraction
takes the last fenced block when fences appear mid-prose (the F21 crack that let prose reach
the artifact and replace test feedback with SyntaxErrors). Applied uniformly, so within-probe
contrasts are unaffected; cross-probe comparisons to F21 are qualitative only.

## Machinery negatives (token-free, measured before any spend)

1. Catalog renders: D0 contains no "impact"; D1 contains the op line, not "LOCKED"; D2
   contains both. One-line diff between D1 and D2; D0 is stock renderCatalog byte-identical.
2. Acceptance: a fixture config with impact in before-attempt → stripped count 1, validates
   clean after strip; impact in after-red → counted as misplaced, stripped, validates; a
   fixture with a genuinely illegal field still reds (the acceptance can fail).
3. World: stub red / reference green / impact 8/8 callers / recall(k=5) < 8 (F21's four,
   re-measured).
4. Extraction: prose + mid-text fenced block → exactly the fenced code; bare code → itself.
5. Dispatch: D2 path on a fixture config emits request-red and injects nothing.

## Pre-registered predictions & readings (categorical; selection/ask rates are counts of 3)

- **P1 (Q1):** D1-MAIN selects impact ≥2/3 AND D1-LEAF selects ≤1/3.
  - P1 holds → authors discriminate → flat full disclosure is fine; primary/secondary tiering
    is DECORATION at this menu size (revisit only at much larger menus).
  - Selects everywhere (MAIN ≥2/3, LEAF ≥2/3) → cargo-cult inclusion → choice management is
    real; tiering (or per-job curation) earns its complexity. hamr's design intuition
    supported.
  - Misses on MAIN (≤1/3) → disclosure alone doesn't surface capability to authors → the
    registry needs need-driven surfacing (failure-evidence unlock), not menu listing.
- **P2 (Q2):** D2-MAIN includes the locked verb ≥1/3 (the ask channel carries signal). If 0/3,
  unlock-by-request is dead and staged disclosure must key on stall/cap-halt evidence.
- **P3 (Q3):** D2-MAIN run outcomes ≈ D0-MAIN categorically (F21's catBeats, neither
  direction), READ CONDITIONAL on authored recall params: if D2 authors systematically widen
  recall (k/kinds) vs D0 and outcomes improve, that is the named §4b catalog-leak finding
  (report as such), not a refutation of the lock.
- **P4 (expression):** D1-MAIN runs where impact was selected green@1 (the F21-C effect
  surviving the authored path end-to-end).

## Deferred (named)

- Staged/tiered disclosure itself (primary → secondary unlock triggers): DESIGN follows from
  Q1/Q2 here; testing an unlock schedule is bareloop work.
- Menu-size scaling (does discrimination degrade at 10/20/40 listed verbs): bareloop, where
  the real suite-wide menu exists.
- The bloat/narrowing direction (removal pressure on an over-wide admitted set): cohort
  question, bareloop.

## Run 1 (2026-07-11, world hhD2yp) — RUN CELLS VOID, authoring cells stand

Two instrument failures, both confirmed in spines, both fixed before rerun:
1. **Op-composition clobber:** the recall op ASSIGNED context.text (interpret.js semantics)
   while impact appends; authored order [impact, recall] erased the entire caller view —
   every D1 worker ran effectively-D0. P4 void. Fix: ops compose (append-only context);
   new machinery negative drives the REAL makeRunOps with [impact, recall] and fails on the
   old code.
2. **Provider crashes:** all 3 D2 runs died at iteration 1 on CLIPipeProvider exit-1
   (rate-limit shaped, ~40 sequential calls in). P3 void. Fix: one retry with 30s backoff;
   a second failure tags the cell provider-red and EXCLUDES it from every read (§5b).

**What survives (authoring cells, unaffected):**
- Q1: cargo-cult under free admission — D1 selects impact 3/3 MAIN and 3/3 LEAF.
- Q2 with the run's best finding: **the lock creates discrimination** — D2 asks 3/3 MAIN but
  only 1/3 LEAF. Free listing gives no selection pressure; locked listing makes the ask a
  considered signal. Direct design input for tiered disclosure: secondary-locked-by-default
  yields discriminating request-reds.
- Q3/P4: to be read from the rerun only.

## Run 2 (2026-07-11, world RuUllB, in-repo at `docs/archive/evidence/menu-disclosure-RuUllB/`) — COMPLETE, all cells readable (0 excluded; 2 provider
## timeouts absorbed by the retry seam)

- **P4 HOLDS, decisively:** D1 3/3 green@1 vs D0 baseline 1/3 green@[4]. The full admission
  chain — author reads menu → selects impact → dispatch injects 8 callers → first-try green —
  reproduces F21-C end-to-end through the AUTHORED path. (Both authored op orders occurred,
  [impact,recall] and [recall,impact]; the composition fix held for both.)
- **P1 CARGO-CULT, replicated:** D1 selects impact 3/3 MAIN and 3/3 LEAF (pooled with run 1:
  6/6 and 6/6). Free listing exerts zero selection pressure. Tiering/curation earns its
  complexity; author selection cannot be trusted as a need signal.
- **P2 ALIVE — but run 1's "lock creates discrimination" DID NOT REPLICATE:** D2-LEAF asks
  3/3 here vs 1/3 in run 1 (pooled: MAIN 6/6, LEAF 4/6). The lock keeps the ask channel
  alive; it does NOT reliably discriminate need at this sample. Downgraded from finding to
  weak trend. Need-weighting must come from run evidence (contrast, failure-driven unlock),
  not from authoring-time asks.
- **P3: catBeats fired (D0 1/3 vs D2 0/3) but in the direction OPPOSITE the leak hypothesis**
  — listing-without-capability never helped D2. Config inspection (registered procedure):
  no systematic recall-widening advantage in D2 (kinds/k comparable; the extra "doc" kind is
  inert here). The one D0 green is a cap-boundary grind-green at n=3 — underpowered noise,
  not leak. The §4b catalog-leak concern is UNSUPPORTED on this evidence.
- **Bonus reads:** (a) D2 request-reds fire EVERY iteration (4/run) — in bareloop, repeated
  same-verb request-reds within a run are a frequency-weighted admission signal for free.
  (b) A D0 cell greened@4 by grinding under the fixed extraction instrument — sharpening
  F21's honest bound: the narrow menu CAN grind to green at cap 4, sometimes; the wide menu
  makes it deterministic-@1. The menu buys first-try certainty, not raw possibility — the
  cost axis, exactly where across-run selection reads it.
