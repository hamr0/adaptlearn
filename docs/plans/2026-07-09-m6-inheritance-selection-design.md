# M6 design — inheritance + selection (the claim)

**Date:** 2026-07-09 · **Status:** validated (design interview) · **PRD:** v1.3 §6 M6, §7b priors
**Scope:** the final ladder module. Verdict-gated retention vs ungated inheritance, plus the
rules-vs-verbatim representation sub-experiment. Graduate or archive — the bar is the point.

## Settled inputs (from PRD v1.3 — not re-litigated here)

- Arms: fixed pipe / ungated / gated-verbatim / gated-rules. Green gates, cost ranks — never
  one fitness score. One-knob mutation, novelty-preferring picker (mechanism, not objective).
- All middle-side spend counts (§7b.3). ~$41 remaining, $2/run cap, cumulative stop at $38.
- §7b priors registered: memory-surfacing is the live axis; no-inheritance baseline ~1/3;
  known worker noise (template-literal class) inflates iterations in all arms equally.

## Decisions made in this design (the interview forks)

1. **Channel — author context only.** Inherited material enters run N+1 as authoring input
   (or as the mechanical mutator's parent config). The worker's litectx store stays per-run
   and empty at start. The claim is about the *harness* improving, and the harness is
   authored; if memory-surfacing is the live axis, the curve must show up as authors wiring
   recall better — not as us hand-feeding the worker.
2. **Mutation/authorship split by arm.** Verbatim (and ungated) arms are fully mechanical
   after gen 0: parent config + one-knob mutation, no author call. Rules arm is
   author-mediated every generation: author sees extracted rules + one green example; the
   novelty picker names the least-explored axis as a prompt nudge. The sub-experiment
   contrasts the two representations *with their natural mutation modes* as one package.
3. **Task family — M5 stall-prone family, distinct instance per generation**, same instance
   across all arms within a generation (arms compared on identical work). Copying a past
   solution can't win; transferring a harness shape can. §7b priors stay applicable.
4. **Rules extraction — sealed LLM extractor, metered.** After each green run in the rules
   arm, one sealed call distills/updates the lineage's rules (≤5 rules, ≤200 chars each),
   stored as an inspectable per-lineage JSON artifact. Cost lands on that run's line.
5. **Ungated arm — last run, verdict-blind.** Identical machinery to gated-verbatim minus
   the verdict filter: inherits the most recent run's config green/red/cap-halted alike,
   replacement unconditional. Exactly one variable differs from arm C: the gate.
6. **Cohort shape — 8 generations × 2 lineages × 4 arms = 64 worker runs.** Two lineages
   because the read is green-rate at a noisy ~1/3 baseline; n=1 per cell makes every
   generation a coin flip. Expected low-$20s; ~$15 margin for probe-06 and surprises.
7. **Probe-06 — rules-channel contrast (kill-switch).** See below.

## The four arms

| Arm | Inherits (into author context) | Mutation | Author calls |
|---|---|---|---|
| **A. Fixed pipe** | nothing | none — same hand config every gen | none |
| **B. Ungated** | previous run's config, verdict-blind | mechanical one-knob, unconditional replacement | gen 0 only |
| **C. Gated-verbatim** | last **green** ancestor's config | mechanical one-knob; replaces parent iff green ∧ strictly cheaper (ties keep parent) | gen 0 only |
| **D. Gated-rules** | extracted rules + one green example config | author re-writes each gen; picker names least-explored axis | every gen + sealed extractor after each green |

Load-bearing contrast: **C vs B** (one difference: the verdict filter). Sub-experiment:
**C vs D** (representation). A reads the floor against §7b.2's ~1/3 prior.

A gated arm with no green ancestor yet inherits nothing that generation (same as gen 0) —
recorded, never papered over; an empty inheritance channel is itself curve data.

Ralph stays stateless and dumb, invoked once per run. Arms and lineages are sequential runs
differing only in seed material assembled *before* the run's gate exists.

## Generation mechanics

Per lineage, per arm, in a cohort runner **outside** Ralph:

1. **Seed** — build authoring input per arm. Mechanical arms skip authoring: apply the
   picker's one-knob mutation to the parent config, re-validate. A mutant that fails
   validation is a red *before tokens* — logged; the picker moves to the next axis, never
   silently retries the same knob.
2. **Run** — Ralph executes the config on the generation's task instance under the $2 cap.
   All spend touching the run — author, worker, revisor, extractor — lands on its cost line.
3. **Record** — append one row to the cohort's append-only JSONL (spine pattern):
   `arm, lineage, gen, taskInstance, configHash, knobMutated, verdict, iterations, costUsd,
   inheritedFrom`. ABSENT-not-fabricate; verdict written by the shell, never middle-side.
4. **Extract** (arm D, green runs only) — sealed call reads that run's facts (config,
   verdict, revision diff if any), updates the lineage rules artifact.

**Selection is code, not judgment.** C: replace iff mutant green ∧ costUsd strictly lower.
B: unconditional. Novelty picker: least-recently-explored legal axis from `knobMutated`
history, deterministic tie-break by fixed axis order.

## The read (registered before the first live run)

- **Primary: green-rate per generation per arm**, pooled across the arm's 2 lineages, and
  pooled early-half (gens 1–4) vs late-half (gens 5–8), n=8 per half — the honest unit at
  this size. Verdict is the only claim-bearing axis (v1.3 §5).
- **Gate load-bearing** ⇔ arm C's late-half green-rate exceeds arm B's, with arm A's floor
  confirming the gap isn't task drift.
- **Cost-to-green ranks** among greens (C vs D efficiency); carries no claim. Iterations
  observer-only. Cap-halts are their own category, never folded into red.
- Rules-vs-verbatim is read **only if** gated beats ungated at all; representation has no
  standing if the gate isn't load-bearing.

## Exit (can fail)

- Gate load-bearing → **M6 graduates**; the experiment's claim stands.
- C ≈ B, or A beats both → **archive + boundary map**, written as a result.

## HITL — the premise is NOT self-heals-all-the-way

Escalation-to-human is a first-class terminal (§5: deliver-green and escalate-decision-ready
are the two honest outcomes; the only real failure is a confident fake green).

- **Per-run (built, M0):** an unfulfillable ask exhausts iterations or hits the cap → Ralph
  escalates decision-ready (config, reds, gap text, spend). §5b: evidence of a broken close
  (the ask itself is wrong) → escalate, **never retry** — self-healing past a wrong ask would
  be the system negotiating with its arbiter.
- **Per-cohort (new — the all-red tripwire):** a generation that goes 0-green across all 8
  runs is §5b's broken-close signal one level up (meaning comes from contrast; an all-red
  generation has none). The runner **pauses and escalates**: human rules the instance bad
  (repair/replace, logged as a ledger event, generation excluded from the curve) or
  hard-but-fair (resume). The runner never silently swaps tasks — that would be authoring
  its own arbiter.

## Stop-rules

- Cumulative M6 spend hits **$38** → cohort halts; a truncated cohort is reported truncated.
- All-red generation → pause + escalate (above).
- Probe-06 indistinguishable → **STOP, redesign channel** (M3 doctrine one level up).

## Probe-06 — inheritance-contrast kill-switch (live, ~$2–3, before any cohort spend)

One real green run → sealed extractor → then 3 repeats each of:
seeded-with-true-rules author / unseeded control / **deliberately-inverted-rules** author
(falsifier — POC bar: machinery negative + control + falsifier arm).

**Pass:** seeded configs differ measurably from control *in the direction the rules point*,
and inverted rules steer the opposite way (the channel carries content, not just tokens).
**Fail:** indistinguishable ⇒ the inheritance variable isn't wired ⇒ stop; a stop is a result.

## Build order (token-free first, live last)

1. **`src/mutate.js`** (token-free) — legal one-knob mutation catalog over schema v1 free
   axes, novelty picker, validation re-check. Tests: every mutant validates; picker
   deterministic + least-recently-explored; illegal mutants red before tokens; **harmony test
   binds the axis list to the schema contract** (F5/F9: mirror enforcement, not docs).
2. **`src/cohort.js`** (token-free) — generation loop, per-arm seeding, selection rules,
   cohort ledger JSONL, stop-rules ($38 + all-red tripwire → pause, escalate, resumable).
   Tests with a stub middle: full 4-arm dry cohort on scripted green/red/cap outcomes;
   tripwire fires on an all-red generation; truncation reports as truncation.
3. **`src/extract.js`** — sealed extractor (same sealed-binding contract as author/revisor:
   empty sandbox cwd, tools disallowed, metered). Tests: seal verified structurally; ≤5
   rules ≤200 chars enforced mechanically post-call; malformed output → red, never a silent
   empty inheritance.
4. **`poc/probe-06-inheritance-contrast.mjs`** (live) — the kill-switch above.
5. **Cohort** (live) — 8 task instances authored from the M5 family **before gen 1**
   (registered up front, no mid-cohort task authoring), run, read, verdict written to
   FINDINGS either way: graduate or archive + boundary map.

## Budget

~$3 probe + ~$22 expected cohort + margin, inside the ~$41 remaining; worst case bounded by
the $38 stop-rule, not by hope. Per-run $2 cap bareguard-enforced as everywhere.

## v2-candidate exclusions (not in M6)

Crossover/multi-parent inheritance; population sizes >2 lineages; adaptive cohort
reallocation; held-out-family transfer probe (a post-M6 follow-up if M6 graduates);
rules inheritance into the worker's store (channel deliberately author-only in v1).
