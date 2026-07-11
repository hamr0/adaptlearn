# Successor product — PRELIMINARY PRD (seed draft, v0.1)

> Status: **SEED DRAFT — not locked.** Written 2026-07-10 in the adaptlearn repo as the
> starting document for the successor's own repo; it becomes that repo's PRD v1 after a
> naming pass and a final bloat audit there. Ground truth it consumes:
> `docs/plans/2026-07-10-agentic-automation-successor-design.md` (validated interview + all
> amendments), FINDINGS F1–F23, PRD v1.5.5, `docs/00-context/CYBERNETICS.md`,
> `docs/plans/2026-07-11-upstream-ledger-design.md`. Nothing here reopens the adaptlearn
> record. Name: deliberately TBD.

## §1 What it is

**"Automate this job — I don't know the best workflow."** A system for tasks that are
**repeated, long, and verifiable**: the operator describes the job and its checkpoints; an
agent authors the workflow scaffolding (a constrained, validated config — never freeform
code); runs execute under an un-gameable outer gate; and the scaffolding *improves across
runs* through verdict-gated, run-as-executed inheritance with ledger-counted attribution.
One-off or small jobs are explicitly out of scope (that's a CLI session).

The pitch in one line: **workflows that earn their own design, with receipts** — every
inherited rule carries the green that minted it and the contrast that attributed it.

## §2 Why it's buildable now (the science this stands on — settled, not re-proven)

| Mechanism | Evidence | Status |
|---|---|---|
| Agents author valid harness configs at hand-written parity | adaptlearn M4 (F10) | proven |
| Mid-run revision recovers stuck runs | M5 (F11: 3/3 vs 1/3) | proven |
| Verdict-gated inheritance beats ungated on pass/fail | F19: gated late 1.00 vs ungated 0.13, valid instrument | proven |
| Run-as-executed inheritance transmits in-run learning | F20: 6/6 lineages across the credit-death boundary, ~½ cost | proven (kill-switch passed) |
| Which-knob attribution is countable from the ledger | V2: contrast bit present 16/16 gens, perfect separation | proven |
| Where memory pays: regularities outside the worker's prior | F17/F18: notes-only conventions → feedforward green@1 at ~8× under acquisition cost | proven |
| API worker seam under the gate | SP-2 smoke | proven |
| Lineages are keyed per (job × declared channel conditions) | SP-2 addendum n=3, V3 | proven |

Open (product measures, not assumes): rule generalization across runs of one real job;
soft-green minting policy; long-horizon gate value under executed inheritance (F20 deferred
it); local-LLM providers.

## §3 Design laws (inherited doctrine — each one was paid for; see F-refs)

1. **The agent authors its workflow; it NEVER authors its arbiter.** Closes, budgets, caps,
   merge/publish decisions live outside the emergent part, permanently. (adaptlearn §2; the
   no-breach record held through every cohort.)
2. **Inherit the run-as-executed, never the run-as-authored.** What a run learned mid-flight
   is lineage property — verdict-gated on admission. (F18 law, F20 proof.)
3. **Verdict admits, contrast attributes.** The extractor reads the ledger (sibling/history
   standing), claims a knob only with ≥1 contrast bit, and every inherited rule carries its
   minting evidence. Bare greens admit nothing into the rules. (F16 gap, V2 validation.)
4. **Green gates, cost ranks — never one fitness score.** Cost pressure is the legal
   optimizer only because the arbiter is outside. (adaptlearn §2/§5.)
5. **Every information path into the worker is a declared job condition** — close verbosity,
   provider path, task framing, scaffold. Channel change = environment change = lineage key
   dimension. (§4b learned twice, SP-2, V3.)
6. **Any claim instrument meters or disables in-run revision** — the fast loop shadows the
   slow loop (F18/Ashby). Product analytics that read "did the lineage learn?" must classify
   greens by mechanism (feedforward vs acquired, V6), not by count.
7. **Escalations travel a channel no emergent component summarizes** — byte-identical from
   shell to human. (V4/Beer's algedonic rule.)
8. **Reds are evidence, never verdicts; cap-halt is its own category; the only real failure
   is a confident fake green.** (§5b, unchanged.)
9. **Mutation/search operators are pre-flighted for reachability against the config space.**
   (V5; the kinds-axis lesson, F13's mirror — twice.)
10. **Consume the bare suite; never paper over a lib gap** — request-reds double as upstream
    findings. (adaptlearn §3.5, unchanged.)

## §4 The shape (three layers, product form)

- **Outer shell (dumb, permanent):** per-run budget cap (bareguard), retry cap, verdict
  collection, escalation routing. Stateless across runs; nothing inside negotiates with it.
- **Emergent middle:** the authored workflow config — steps, per-step verdict class, memory
  binding, hook ops, write scopes — schema-validated, config-red before tokens burn.
  Mid-run revision allowed in production runs (it recovers runs and its learning is captured
  by law #2); disabled in claim/analytics cohorts (law #6).
- **Floor:** append-only JSONL spine (single source for every UI), litectx store per job,
  ledger with per-run rows. The panel is a pure observer of the spine.

**Verdict classes, gated per step** (interview decision #2):
- **Hard green** — predicate/exit-code truth. Mints inheritance automatically.
- **Soft green** — rubric/assessment. Passes the run; mints only with HITL confirm or N
  consistent repeats (policy picked after job #1 data).
- **HITL green** — a human is the close (PR merge, "publish"). Mints. Merge stays human
  forever.

**Primitive menu, MCP-disclosure style** (decision #3): full bare-suite surface listed to the
author; only admitted verbs callable; locked-primitive need → structured request-red →
explicit registry admission; removal is first-class mutation.

## §5 The product surface

The **panel** is the face (decision #7): define a job (description, checkpoints + verdict
classes, budget, cadence, worker/provider), watch runs (chat incl. HITL prompts; grid by
generation × verdict; detail = spine stream), and the trust surface: **"what has this lineage
learned"** — current rules, each with minting green + contrast evidence. API-first providers
(SP-2); local LLMs deferred. Web UI deferred until the loop closes headless (spine-first, so
the UI is always a pure observer).

## §6 Job #1 — auto-maintainer on litectx (decision #5)

review → fix → branch → PR → **human-gated merge, forever**. Hard greens: litectx's own
suite + lint; bareguard write scopes cap the diff; the PR is the escalation artifact. The
store seeds from CLAUDE.md/AGENT_RULES; what the lineage learns is per-repo folklore — which
F17/F18 showed is exactly the regularity class where memory pays (outside the worker's
prior). Job #1 doubles as the measurement bed for the §2 open questions: rule generalization
across non-identical runs, soft-green minting policy, long-horizon gate value.

## §7 What must be built that the experiment never had

Close-authoring UX (job description → honest per-step close chain; predicate > GOLD arbiter >
rubric-advisory); job/schedule model (bareagent Scheduler + per-run bareguard budget);
the contrast-bit extractor (V2 rule, ledger-reading); the request-red registry; per-job
channel declarations; the panel. Ports near-verbatim from adaptlearn (~600 lines + test
semantics): ralph.js, validate.js, interpret.js (with config-final), extract.js pattern,
spine.js, cohort-ledger shape.

## §8 Non-goals

No swarm, no orchestrator frameworks, one process per run. No freeform code as scaffolding.
No self-adjusted budgets — ever (the agenticSeek smell). No UI before the headless loop
closes on job #1. No local-LLM work until the API path earns it. Not a general agent — a
place where *repeated, verifiable* jobs get better at themselves.

## §9 Risks & their pre-registered handles

- **Rules don't generalize across non-identical runs** → job #1's first measurement; if
  transmission needs per-task-family lineages, the lineage key already supports it (V3).
- **Fit-to-pass drift under executed inheritance at long horizons** (F20 deferred) → keep the
  gate on admission; measure retention/drift on job #1's real timeline before relaxing.
- **Soft greens minting junk** → default to HITL-confirm minting until N-consistent has data.
- **The close chain is wrong/gameable for a real job** → close-authoring hierarchy + the §4b
  channel declaration; a close the operator can't explain is a close the product shouldn't
  trust.

## §10 Build order (module ladder, sketch — each rung POCs its riskiest assumption)

N0 port + shell + spine (token-free) → N1 job/close schema + validator → N2 single-job
headless loop (job #1 minimal: review→fix→PR on litectx, hard greens only) → N3 executed
inheritance + contrast-bit extractor live on job #1 (kill-switch: rules must transmit across
non-identical runs — the §2 open question) → N4 verdict classes complete (soft/HITL minting)
→ N5 scheduler + budget ops → N6 panel. A rung that cannot meet its exit stops the ladder;
the stop is a result. Budget discipline unchanged: hard cap per run, cap-not-estimate.

## §11 The PRD-spine checklist (VSM variety audit, 2026-07-12 — rides into the repo cut)

The one-sentence version: **a system heals at every level it has** — give every subsystem its
own loop, its own named red, and its own undeletable signal. Each item below names its spine
events and the evidence that paid for it; the new repo's PRD v1 must place every item in a
section or strike it deliberately (no silent drops).

### Five healing loops

1. **Within-run — the step heals itself.** Mid-run revision (F11), plus two F21 port notes as
   first-class red categories: **artifact-red** (a non-code artifact reds on its own, never
   corrupts the close signal) and **primitive-smoke** — a per-job known-answer check for every
   admitted primitive BEFORE spend (the A3 class: silent bugs throw nothing; the empty index
   was caught only by a measured negative). Spine: `revision`, `artifact-red`,
   `primitive-smoke`.
2. **Across-run — selection heals the harness.** Green gates, cost ranks; one knob per
   mutation; inherit the run-as-executed (F18/F20). Spine: `config-final` per run, and ≥1
   contrast bit per claimed knob (V2) — bare greens admit nothing.
3. **Menu — admission heals capability.** Locked primitive → structured `request-red` (op +
   iteration; within-run frequency is the need weight, F22 bonus read) → registry admission →
   rerun. Admission keys on ledger evidence (request-red frequency + green@1-vs-grind
   contrast), NEVER on author selections or authoring-time asks — both proved cargo-cult
   (F22 P1 robust, P2 non-replicated). Removal is symmetric, first-class mutation.
4. **Lib — the human heals the substrate.** The upstream ledger is a pure listener over
   spines (8 classes, dedupe by lib:verb:class:signature, fold = current state); lifecycle
   `open→filed→fixed→consumed` with filing human-gated forever. Spec + reference impl:
   `docs/plans/2026-07-11-upstream-ledger-design.md`, `poc/upstream-ledger.mjs` — consume
   as-is. Close reds and bare cap-halts are excluded BY DESIGN (workflow stories, not lib
   incidents).
5. **Instrument — the probes heal the probe.** Machinery negatives measured token-free before
   any spend; every meter carries a must-fail fixture; negatives drive the REAL code path,
   never a replica (the F22 run-1 clobber survived a replica-based negative). Provider
   failures are instrument, not verdict: retry once, then `provider-red`, excluded from every
   read (§5b).

### Three structural rules (make the failure unrepresentable, not discouraged)

- **V8 — no single fitness score (anti-S5-collapse).** Verdict and cost travel as separate
  values end-to-end; no function in the selection path combines them into one scalar.
  Lintable; a PR introducing a combined score is rejected on sight.
- **V4 — algedonic escalation.** Escalation text reaches the human byte-identical to what the
  shell emitted; no emergent component writes, summarizes, or filters that channel.
  Testable: byte-compare shell emission vs human delivery.
- **V7 — the S2 red category (registered probe, fires on job #1).** Coordination failures
  between steps/units — write-scope contention, step-order violations, store races — get
  their own spine name (`coordination-red`), never folded into worker-red/interpreter-red.
  This is the ONE subsystem adaptlearn structurally could not test (one process, one S1,
  sequential runs — nothing to coordinate), so it ships as a pre-registered prediction, not
  a proven mechanism: **prediction** — the first multi-step job surfaces ≥1 red that
  attributes to no single unit (S2-class); **falsifier** — if every job-#1 red attributes
  cleanly to a single unit under §5b contrast, V7 over-predicted: note it, keep the category
  as a named-but-empty bin, and move on. Until the probe fires, no S2 machinery beyond the
  named category is built (the category is the instrument that makes S2 reds visible;
  building schedulers before one is observed would be cargo-cult coordination).

### Two variety-engineering manifests (Beer's question, made a deliverable)

- **Every attenuator declares its destruction.** Each summarizing point (extractor, ledger
  fold, gap slice, escalation routing) documents per field: what is destroyed, what survives,
  and why nothing downstream needs the dropped part — the ledger design doc's field table is
  the template. An attenuation without this manifest is a review blocker.
- **Every amplifier declares its truncation — HYGIENE, not load-bearing (F23 decided).**
  The floor stands: ranked views never claim exhaustiveness; only structurally exhaustive
  views may. The FULL rule (a declaration sentence in every partial injection) tested NULL —
  attribution@2 was 3/3 in BOTH arms, because F21's poisoning mechanism itself failed
  replication under the fixed instrument (its evidence lived in the contaminated iterations;
  narrow-arm failure is hunting/oscillation, not dismissal). Keep the floor on manifest/
  honesty grounds — the injection-side twin of the ledger's "ABSENT, not fabricated" — and
  never rely on a declaration to fix attribution: that fix is structural (exhaustive verbs,
  admission). Evidence: F21, F23, `truncation-declared-E1wCrp`.

---
*Seed written 2026-07-10 in adaptlearn (v0.11.0); §11 checklist added 2026-07-12 (v0.11.x
probe track). First act in the new repo: name it, audit this draft for bloat, lock v1.*
