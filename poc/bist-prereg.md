# Pre-registration — V9 instrument BIST (stuck-at catalog + detection vectors)

**Registered:** 2026-07-13, before any code runs. Assignment: hamr (PRD v1.10 addendum,
CYBERNETICS §B4/V9). Sandbox: adaptlearn (F21/F22/F23 pattern — POC here, spec consumed by
bareloop, reference impl never shipped). **Token-free**: no model calls anywhere; the
instrument's worker seam is out of scope by design (the BIST tests the machinery that
*judges and records* workers, not workers).

## Question

Can a token-free vector suite over the **real** instrument components detect every fault in
a declared stuck-at catalog, with zero false positives on the good instrument, where every
vector's detection power is proven load-bearing by sabotage (mutation-validation, the F4
pattern)? Motivation: F23's contaminated instrument cell was an undetected instrument fault,
found only by a replication rep after tokens were spent. A BIST is the pre-flight that finds
that class before the spend.

## Instrument under test (real code paths, no replicas)

- `src/ralph.js` — `runClose` (exit-code → verdict mapping) and `ralph` (the loop, honest
  terminals, escalation payloads)
- `src/spine.js` — `makeSpine` (append-only JSONL, monotonic `seq`, `ts` stamped last)
- `src/validate.js` — `validateConfig` (named reds before tokens)

Faults are injected **at the component seams** (a fault is synthetic by definition — ATPG
simulates the fault, never requires a naturally broken chip). Detection vectors are the real
checks that would ship as a pre-flight: they exercise the real components and the real
read-back paths.

## Fault catalog (stuck-at model)

| id   | fault                                                        | seam            |
|------|--------------------------------------------------------------|-----------------|
| F-C1 | close stuck-at-green (argv always exits 0)                   | close argv      |
| F-C2 | close stuck-at-red (argv always exits 1)                     | close argv      |
| F-S1 | spine drops events (every 2nd emit silently dropped)         | emit wrapper    |
| F-S2 | spine freezes seq (every event seq=1)                        | emit mutant     |
| F-S3 | spine stamps ts first (ordering contract broken)             | emit mutant     |
| F-V1 | validator stuck-at-green (always `{ok:true, reds:[]}`)       | validator subst |
| F-E1 | escalation channel summarizes (detail truncated before write)| emit wrapper    |

## Detection vectors

| id    | vector (run against good AND faulted instrument)                                   | detects    |
|-------|-------------------------------------------------------------------------------------|------------|
| VEC-1 | known-red fixture: real `node --test` close over a temp dir with one failing test → `runClose` returns `needs_revision` with non-empty gap | F-C1 |
| VEC-2 | known-green fixture: same, passing test → `satisfied`                               | F-C2       |
| VEC-3 | broken-close mapping: argv names a nonexistent binary → verdict `failed` (never `needs_revision`/`satisfied`); full `ralph` run → `broken-close` escalation, outcome `escalated` | (mapping check, no paired fault) |
| VEC-4 | spine integrity: emit K=7 typed events → file has exactly K lines; every line parses; `seq` strictly 1..K; `ts` is the FINAL key of every object; `type` present | F-S1, F-S2, F-S3 |
| VEC-5 | escalation byte-identity: `ralph` with middle throwing `{category:'gate-red', message:M}` (M contains spaces/unicode) over a real red close → spine contains `escalation` event, `category==='gate-red'`, `decisionReady===true`, `detail` **byte-identical** to M; a category-less throw maps to `interpreter-red` | F-E1 |
| VEC-6 | cap-halt honesty: middle that never fixes + real red close + `capRuns=2` → outcome `escalated`, spine has `cap-halt` event, zero `satisfied` verdicts | F-C1 (green-on-broken also trips here) |
| VEC-7 | validator named reds: config missing `gate.writeScope` + `remember` in `after-red` → `ok:false` with `missing-required @ gate.writeScope` AND `verb-placement`; a known-valid config → `ok:true` | F-V1 |

## Arms

1. **CONTROL** — all vectors × good instrument: every vector must pass. Any failure is a
   false positive → POC red for that row (leak-search the mundane explanation first, §doctrine).
2. **DETECTION** — each fault × its paired vector(s): the vector must fail (= fault detected).
3. **FALSIFIER** (`--falsify`) — each paired vector, sabotaged (assertion weakened: VEC-1′
   accepts any verdict; VEC-2′ accepts any; VEC-4′ checks only that lines parse; VEC-5′
   checks event existence but not byte-identity; VEC-6′ checks only that an outcome string
   exists; VEC-7′ checks only that `ok` is boolean) × its fault: the sabotaged vector must
   **MISS**. If it still detects, the detection power was incidental (a crash, not the
   assertion) — that vector is NOT load-bearing (the F22 replica-negative lesson,
   mechanized).

## Pre-worded readouts (all shapes, in advance — F23's lesson)

- **GREEN:** control clean (0 false positives) ∧ 7/7 faults detected ∧ all sabotaged
  vectors miss → BIST viable as a probe pre-flight; the spec (catalog + vectors + arms)
  ships to bareloop; the script stays POC.
- **NULL shape A (detection gap):** ≥1 fault undetected by its paired vector → the vector
  design is insufficient at that seam. Named per seam; the fix is redesigning the vector and
  re-running the whole suite — never widening an assertion post-hoc to make the row pass.
- **NULL shape B (falsifier failure):** ≥1 sabotaged vector still "detects" → its detection
  came from machinery incidentals, not the assertion; the vector is reclassified
  non-load-bearing and the row is a false comfort the BIST must not ship with. This is a
  result about the vector, not the component.
- **Mixed:** shapes A and B can co-occur on different rows; report per-row, no pooling into
  one scalar (V8 discipline applies to readouts too).
- **CONTROL false positive:** an instrument-or-vector bug, not a finding — mundane
  explanations exhausted first (env, tmp dirs, NODE_TEST_CONTEXT class of leaks) before any
  catalog change.

## Exit codes / run

- `node poc/bist.mjs` — CONTROL + DETECTION; exit 0 iff control clean ∧ all faults detected.
- `node poc/bist.mjs --falsify` — FALSIFIER; exit 0 iff every sabotaged vector misses.
- Per-row table printed; outcomes reported, never asserted in prose.
