# adaptlearn — Agent Context

**adaptlearn** is an experiment: can an agent's *harness* — not its plan, not its code — be an
emergent, adapting artifact that improves across runs? It consumes the bare suite (`bareagent`,
`litectx`, `bareguard`) and relayfact's settled results; it builds **no primitives**. Manus-class
systems rewrite the *plan* inside a fixed harness; adaptlearn probes one level up: the harness
file as a runtime output under verdict-gated inheritance. Like relayfact, it either **graduates
or gets archived** — the bar is the point.

## Source of truth — read these first

These govern; this CLAUDE.md only adds adaptlearn-specific doctrine. When anything here
disagrees with them, **they win**.

1. **`.claude/memory/AGENT_RULES.md`** — parent standard: Spec→Verify→Environment, POC-first,
   prove-don't-assert (the test must be able to fail), dependency hierarchy (vanilla → stdlib →
   external), simple-over-clever, surgical changes, the Testing Trophy, security invariants.
2. **`docs/01-product/adaptlearn-prd.md`** — the LOCKED v1.1 PRD (claim + falsifier, three-layer
   shape, §5b red-attribution doctrine, module ladder M0–M6, budget). Cited as `§N`. Changes go
   through explicit PRD edits, not drift.
3. **`docs/plans/2026-07-08-schema-v1-design.md`** — the validated schema v1 design (config
   shape, loop menu, slots, verb subset, validation rules, M3 contrast pair, v2-candidate
   exclusions). M1–M3 build against it.
4. **`docs/00-context/FINDINGS.md`** — the running, no-papering-over log. Friction with the
   three libs is a finding filed upstream; "works as intended" is a finding too; a stopped
   ladder module is a result, not something to report around.

`.claude/memory/LIBRARY_CONVENTIONS.md` is mostly **N/A** — adaptlearn is an experiment, not a
published library. Take only the always-true hygiene (pure ESM, JSDoc, no secrets).

## adaptlearn doctrine — the dos & don'ts

- **The agent authors its harness; it NEVER authors its arbiter.** Close, gate, cap, and
  escalation live in the Ralph shell, permanently outside the emergent part. "Let the agent
  adjust its own budget" is the agenticSeek smell — out, always. (§2, §3.3)
- **The Ralph shell stays dumb — its stupidity is the security model.** ~50 lines of stdlib,
  outside all three libs: `while close-red && under-cap: run the middle`. Executable stop
  condition, deliberate persistence. Nothing inside can negotiate with it. Ralph is **stateless
  across runs**; only the store differs between run N and N+1. Never make it smarter. (§2)
- **Harness = constrained config (schema v1), not freeform code.** Required fields (gate +
  write-scope, memory binding, escalation wiring) or validation reds *before tokens burn*; the
  close is not expressible in the config at all. Schema-too-rigid ⇒ a finding + explicit v2
  trigger, never silent widening. (§2, §3.8)
- **Within a run: stop at first green.** Tuning a passing harness inside the run is the
  fit-to-pass surface. Across runs: **green gates, cost ranks — never one fitness score**
  (efficiency must not negotiate with truth). Mutation is **one knob at a time**; the mutant
  must stay green and dominate on cost to replace its parent. (§2)
- **Improvement is nobody's goal.** The learning curve is an observer reading on the ledger,
  never an in-loop target — anything optimizable inside the system will be optimized against. (§2)
- **Read reds through §5b, always.** A red is evidence, not a verdict — five meanings (worker
  ceiling / bad harness / broken close → escalate, never retry / cap halt = "not under $2", its
  own category / schema can't express). Meaning comes from CONTRAST, never counts alone.
  **Asymmetry:** reds never mint inheritance, but reds steer mutation. Every run in the
  denominator; the only real failure is a confident fake green. (§5b)
- **Grounding is imported settled, not re-derived.** Predicate close primary; rubric advisory
  only, never the sole close; GOLD arbiter stands where a close is self-authored; retention =
  surfaced ∧ evidence-of-use ∧ green close. litectx benches are not re-litigated. (§4)
- **Consume, don't build — and never paper over a lib gap.** A needed primitive is a finding
  filed upstream, never code grown here: no local shims or workarounds that hide the gap. The
  libs are ours (`hamr0` origin), so log the finding → fix upstream → consume the fixed
  version → continue. (§3.5) No swarm, no Docker/Redis/router, one
  process; "population" = sequential runs. Spine + CLI listener; no web before the loop closes. (§3)
- **Event-stream spine: copy relayfact's pattern, not its code.** Append-only JSONL, stdlib,
  `type`/`seq`/`ts` stamped last, pure listeners, ABSENT-not-fabricate. Extract to a lib only on
  a third consumer.
- **Budget by cap, never point estimate.** $2 hard cap per run (bareguard-enforced), ~$50 for
  M2–M6; cost is ~10× noisy run-to-run. (§7)
- **`poc/` is throwaway.** Never ship the POC; graduating it is a rewrite.

## Module ladder (PRD §6 — the build order)

M0 shell+spine (token-free) → M1 schema+validator (token-free) → M2 interpreter → M3 **contrast
check = keystone/kill-switch** (two opposed hand-configs MUST differ measurably, or the variable
isn't wired in → STOP, redesign schema) → M4 agent authorship (parity gate) → M5 mid-run
revision → M6 inheritance+selection (the claim; rules-vs-verbatim sub-experiment). Each module
POCs its riskiest assumption, graduates by rewrite, and stands alone before the next. A module
that cannot meet its exit **stops the ladder** — that stop is a result.

## Dev Rules (from AGENT_RULES.md — mandatory)

**POC first.** Validate logic with a ~15min POC aimed at the riskiest assumption before building.
Prove, don't assert — measure anything you call "cheap"/"fast"; the test must be able to FAIL
(real uncrafted data, not a fixture authored to contain the result; two should-differ conditions
matching is a finding). POC works → design → build with tests. Never ship the POC.

**Build incrementally.** Small independent modules, each working end-to-end before integrating.

**Dependency hierarchy — strict:** vanilla → stdlib → external (only when stdlib can't in <100
lines). External deps must be maintained, lightweight, widely adopted; vetted libs for
security-critical code.

**Lightweight over complex. Surgical changes only. Open-source only.** No secrets in the tree
(env at runtime; only `.env.example` committed).
