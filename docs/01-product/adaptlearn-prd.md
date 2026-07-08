# adaptlearn — PRD (v1, LOCKED 2026-07-08)

> Status: **LOCKED v1 — the governing spec M0 builds against.** Changes go through explicit PRD
> edits, not drift. Decisions locked: primary claim = cross-run adaptation; harness artifact =
> constrained config (schema v1); task domain = relayfact's (single JS function, oracle+GOLD /
> repo mode); inheritance = rules-vs-verbatim sub-experiment (§6 M6); budget = $2 cap per run,
> ~$50 for the ladder (M2–M6); repo public from day one.

**adaptlearn** is an experiment: can an agent's *harness* — not its plan, not its code — be an
emergent, adapting artifact? It consumes the bare suite (`bareagent`, `litectx`, `bareguard`) and
relayfact's settled results; it builds no primitives. Like relayfact, it either **graduates or
gets archived**, and the bar is the point.

Lineage: relayfact answered "can a grounded loop deliver?" (yes — shipped 0.1.0). Manus-class
systems rewrite the *plan* inside a fixed harness. adaptlearn probes the one axis neither moves
on: the harness itself as a runtime output that improves across runs.

---

## §1 The claim (falsifiable, graduate-or-archive hangs on it)

**Primary — cross-run adaptation:** harnesses inherited across sequential runs, retained under a
verdict-gated rule (surfaced ∧ used ∧ close-green), produce a **measurable learning curve** —
green-close rate and/or cost-to-green improves with run index on a task cohort, and the fixed
relayfact pipe (which by construction cannot adapt) shows no such curve.

**The falsifier that makes it honest:** an **ungated-inheritance control** — inherit harnesses
randomly, or from red runs, under the same mechanics. If ungated inheritance matches gated
inheritance, the gate is not load-bearing and the claim **dies**. (Three-factor rule imported
from the Hebbian result: co-occurrence alone re-learns noise; only surfaced ∧ used ∧ validated
earns retention.)

**Secondary (measured, not graduating):** mid-run self-healing — on a stalled close, the agent
revises its *harness file* (not just its code) and recovers; reported as recovery rate.

**Entry gate (Phase 0/1, not a claim):** single-run self-assembly reaches parity with the fixed
pipe on easy tasks. One run of self-assembly is planning, not adaptation — it gates, it doesn't
graduate.

---

## §2 What it is (the shape)

Three layers, dumbest outermost:

1. **The Ralph shell (fixed, non-negotiable).** A deliberately dumb outer loop — ~50 lines of
   stdlib, outside all three libs: `while close-red and under-cap: run the middle`. It holds the
   **grounded close** (exit code = truth, same Verdict mapping as relayfact) and the **budget**.
   Its stupidity is the security model: nothing inside can negotiate with it. Ralph's two
   upgrades here: the stop condition is executable (not vibes), and persistence is deliberate
   (not accidental git archaeology).
2. **The emergent middle (the object of study).** The agent's first act is to **author its
   harness as an artifact**: a constrained config (schema v1) over the primitive catalog — the
   write · select · compress · isolate ops, loop shape, memory policy, decomposition choice. An
   interpreter executes the config by composing bareagent/litectx/bareguard primitives. On a
   failed close, the gap feeds back and the agent may revise the config mid-run.
3. **The stigmergic floor (fixed).** Append-only JSONL event spine (pattern copied from
   relayfact — stdlib, `type`/`seq`/`ts` stamped last, pure listeners) + litectx as the
   cross-run store. Harnesses that closed green are stored as facts, verdict-gated, and seed the
   next run's assembly. Coordination across runs happens through traces, not protocols.

The agent authors its harness. It **never authors its arbiter** — close, gate, cap, and
escalation stand outside the emergent part, permanently.

**What improves, and where (the two timescales):**

- **Within a run: Ralph stops at first green.** No gold-plating past the close — tuning a
  passing harness inside the run is the overfit/fit-to-pass surface (polishing toward the
  visible close). Stop-at-green is a discipline, not a limitation.
- **Across runs: selection on cost, correctness held fixed.** "Solid but needs fine-tuning" is
  a second-order signal the binary close can't express — so it lives in the inheritance layer:
  among green harnesses, selection runs on **cost-to-green / iterations**. The agent may
  **mutate an inherited green harness**; the mutant must still close green and replaces its
  parent only if it dominates on cost. Ralph never gets smarter; the harness population does.

**Required primitives (the schema's non-negotiable fields):** a config **cannot validate**
without its bareguard gate + write-scope binding, its memory-store binding, and its escalation
wiring. The grounded close is not expressible in the config at all — the shell owns it, so it
cannot be omitted or weakened. The interpreter validates the config **before any tokens burn**;
config validation is itself a deterministic predicate that can fail (an invalid config is a red,
not a crash). Required fields are the flock's local rules; the free axes — loop shape, ops
ordering, memory policy, decomposition — are where emergence lives.

---

## §3 What it is NOT

1. **Not relayfact v2.** relayfact's question is settled and shipped. Different claim, same bar.
2. **Not a Manus clone / not a plan-rewriter.** Plan-rewriting inside a fixed harness ships
   commercially today. The object of study is one level up: the harness file.
3. **Not emergent-arbiter, ever.** The agent never touches close, gate, cap, or escalation. A
   proposal to "let the agent adjust its own budget" is the agenticSeek smell and is out.
4. **Not a swarm.** No parallel fleets, no Docker/Redis/router, single process. "Population"
   means *sequential runs with verdict-gated inheritance* — the flock exists across time, not
   across cores.
5. **Not a framework, not a product.** Consumes the three libs; a needed primitive is a finding
   filed upstream, never code grown here.
6. **Not memory research redux.** Verdict-gated retention arrives as a settled import
   (relayfact D3 + the three-factor rule); litectx benches are not re-litigated.
7. **Not a UI project.** Spine + CLI listener. No web before the loop closes.
8. **Not freeform code-mode (yet).** Schema v1 is the harness language. If the schema proves too
   rigid to express a winning harness, that is a **finding** and the trigger for a code-mode v2
   — not a silent widening.

---

## §4 Grounding model (imported as settled, not re-derived)

- Predicate close primary; agentic strongest; **rubric advisory only, never the sole close**.
- Where a close is self-authored, the **independent GOLD arbiter stands** (fit-to-pass guard).
- Exit code → Verdict: 0→satisfied; nonzero→needs_revision (gap fed back); spawn-err→failed
  (terminal → escalate). Strip `NODE_TEST_CONTEXT` before spawning any `node --test` close.
- Escalation must be decision-ready; recitation is the anti-drift mechanism.
- Retention rule: **surfaced ∧ evidence-of-use ∧ green close** — use-evidence ranked
  failure-transition > artifact overlap > self-citation (self-report is a candidate, never proof).

## §5 Controls & metrics (every positive arm must be able to fail)

- **Control arm:** the fixed relayfact pipe on the identical task cohort — already validated,
  free, and by construction non-adaptive.
- **Gate control:** ungated/random inheritance (the claim's falsifier, §1).
- **Contrast check (Phase 0):** two hand-authored, deliberately opposed configs must produce
  measurably different outcomes on the same task. Identical outcomes = the variable isn't wired
  in = stop and redesign the schema. (Two should-differ conditions matching is a finding.)
- **Metrics, all counted with every run in the denominator:** green-close rate by run index;
  cost-to-green (budget by cap, not point estimate — cost is ~10× noisy run-to-run);
  escalation count + decision-readiness; **fit-to-pass attempts caught by the shell** (expected
  >0 in an adaptive setting — count them, don't hide them); harness diversity over time
  (convergence to a niche vs collapse to one config).

## §6 Module ladder (build-incrementally: every module POCs, graduates, and stands alone before the next)

Each module has its own POC aimed at its riskiest assumption, its own standalone exit criterion,
and must work on its own before integrating with the next. Token-free modules come first; live
spend comes last. Claim-phases map onto the ladder (P0 = M1–M3, P1 = M4, P2 = M5, P3 = M6).

| M | Module | Riskiest assumption / POC target | Exit (standalone, can fail) | Tokens |
|---|--------|----------------------------------|------------------------------|--------|
| M0 | **Ralph shell + spine** | shell honestly loops red→red→cap and escalates on a noop middle (relayfact probe-01 shape) | noop middle → red, cap halt, decision-ready escalation; events sequenced | none |
| M1 | **Schema v1 + validator** | required-field rejection actually rejects | valid fixture passes; each missing required binding → distinct red before execution | none |
| M2 | **Interpreter** | a hand-authored config executes to a green close on one easy task | green on valid config; broken config → red not crash; gate provably binds (over-cap halts) | live, minimal |
| M3 | **Contrast check** | *the load-bearing one:* two opposed hand-authored configs produce measurably different outcomes | difference observed on ≥1 task; identical outcomes = STOP, redesign schema (variable not wired in) | live, small |
| M4 | **Agent authorship** | agent can author a *valid* config from task + catalog | parity with fixed pipe on small easy cohort, under cap, fit-to-pass counted | live |
| M5 | **Mid-run revision** | on a stalled close the agent revises the *config*, not just code | recovery rate > no-revision control on stall-prone tasks | live |
| M6 | **Inheritance + selection** (the claim) | verdict-gated retention beats ungated | learning curve vs (a) fixed pipe, (b) ungated/random inheritance; gate load-bearing → graduate; else archive + boundary map. **Sub-experiment:** two gated arms — inherit *extracted rules + example* vs *verbatim green configs* — the learning curves decide the representation | live, cohort |

No module ships its POC; each graduates by rewrite, same as house rules. A module that cannot
meet its exit **stops the ladder** — that stop is a result, not a failure to report around.

## §7 Budget & remaining work items

- **Budget (settled):** $2 hard cap per run (bareguard-enforced); ~$50 total for M2–M6.
  relayfact lesson: cost is ~10× noisy run-to-run and model-noisy — budget by cap, never by
  point estimate. M6 sizes its cohort to the remaining budget after M2–M5 actuals.
- **Inheritance representation (settled as sub-experiment):** rules-vs-verbatim, two gated arms
  in M6 (§6).
- **Open work item — schema v1 shape:** the ops vocabulary and how much freedom each op
  carries. Needs its own design pass before M1; the M3 contrast check is the acceptance test
  for whatever we draft.
