# Successor product design — automated agentic automation (validated interview, 2026-07-10)

> Status: **DESIGN RECORD, pre-repo.** Captured from the post-archive design interview with
> hamr (2026-07-10, while SP-1 runs). This document is the bridge between adaptlearn (the
> archived experiment, v0.10.0) and the successor product; the product gets its own repo and
> PRD after SP-1 concludes. adaptlearn's PRD stays closed — this doc consumes its findings,
> it does not reopen them.

## The product, in one paragraph

A place to say **"automate this job — I don't know the best workflow"** for tasks that are
**repeated, long, and verifiable**, and have the system discover, run, and keep improving the
workflow itself: agent-authored scaffolding under an un-gameable outer gate, lessons inherited
across runs only when a real verdict minted them, scaffolding growing or shrinking to fit the
worker model, all operated from a web panel using API or local models. One-off/small jobs
explicitly out of scope (that's a CLI session). The industry direction (Ralph-Wiggum loops,
RLMs, MCP Codemachine — agents writing their own scaffolding) is the tailwind; the bare suite
(bareagent, bareguard, litectx, barebrowse, baremobile) is the full primitive set; exercising
the suite and filing what's missing upstream is an explicit secondary goal.

## What the archived experiment already settled (consume, don't re-prove)

- **Agent-authored harness at parity with hand-written** (M4). The product's core claim —
  "you don't have to design the workflow" — passed in 2026-07-09's record.
- **Mid-run revision recovers stuck runs** (M5: 3/3 vs control 1/3).
- **Verdict-gated inheritance transmits true environmental knowledge** (M6 mechanism, twice,
  in two close-verbosity conditions: discover → gate → codify → transmit → stable first-try
  expression at ~10× lower cost).
- **The boundary map** (PRD v1.5 §7d): with strong workers on guessable regularities, memory
  buys first-try rate and ~10× cost, not pass/fail. SP-1 (F16, running) measures the weak-
  worker side. Product consequence: the payoff axis depends on worker tier — and both axes
  (capability for weak workers, cost for strong ones) are product value, even though only one
  could carry the *experiment's* claim.
- **Doctrine that transfers as product architecture, not science hygiene:**
  - The agent authors its harness; it NEVER authors its arbiter. In the product: the user's
    close and the merge/publish decision stay outside the emergent part, permanently.
  - Harness = constrained validated config; config-red before tokens burn.
  - Green gates, cost ranks. In the product this legally becomes the *optimizer* (converge to
    green, then drive cost down) — safe exactly because the arbiter is outside.
  - Every information path into the worker is part of the instrument (§4b) → in the product:
    channels are declared per job, and close verbosity is a job setting, not an accident.

## Design decisions from the interview (hamr-confirmed)

1. **Scaffolding evolves both directions, per (job × worker tier).** Weak worker: reds steer
   mutation toward more scaffolding. Strong worker: everything greens, cost pressure strips
   scaffolding to the leanest green config. No one designs "how much scaffolding" — selection
   does. Worker tier is an operator choice (and a candidate mutation knob later).

2. **Three verdict classes, gated PER STEP — not per workflow.** A workflow is a chain of
   checkpoints, each with its own class:
   - **Hard green** — predicate/exit-code truth (tests, build, lint, "did the browser land on
     the sub", "does the draft exist"). Mints inheritance automatically.
   - **Soft green** — rubric / Evaluator / barebrowse-agentic assessment. Passes the run;
     mints inheritance only with HITL confirm or N consistent repeats.
   - **HITL green** — a human is the close (e.g. PR merge, "publish this post"). Mints.
   Example (hamr's): post-to-reddit = hard greens down the mechanical chain (browse → sub →
   compose → preview), soft/HITL at the end result (posted, or mod-blocked — which is a
   verdict about the environment, not the workflow). The job-creation UI shows this as the
   verifiable / hard-to-verify choice; underneath it is an inheritance policy per checkpoint.

3. **Primitive menu, MCP-disclosure style, with removal as first-class.** The full bare-suite
   surface is *listed* to the authoring agent (names + one-line purposes); only admitted verbs
   are *callable*. A locked primitive that would solve the problem → structured request-red →
   admission by explicit registry edit. Removal is just mutation in the narrowing direction —
   already expressible. Every request-red doubles as a lib-gap finding filed upstream.

4. **New repo, after SP-1 concludes.** Graduation is a rewrite (house rule). Reasons beyond
   dogma: the archive record's integrity is the product's credibility (leave it clean); the
   experiment code is instrumented for science (cohort arms, contrast machinery) that a
   product would fight; public-repo identity (own name/README/npm). What ports: ralph.js,
   validate.js, interpret.js, extract.js patterns (~600 lines, near-verbatim), the three-layer
   shape, the verdict classes, adaptlearn's 117 tests as reference semantics. adaptlearn stays
   linked as "the science behind it."

5. **Job #1: auto-maintainer on `litectx`.** review code → fix → branch → PR → HITL confirm.
   - Close: litectx's own suite + lint (hard greens); diff scope-capped by bareguard
     writeScope; PR is the escalation artifact; **merge stays human forever** (the arbiter
     line, product form).
   - Store: litectx indexes the repo; conventions seed from CLAUDE.md / AGENT_RULES; what the
     lineage learns is per-repo folklore, each rule carrying the green that minted it.
   - Why litectx: strong real suite (honest close), small enough for reviewable PRs, active
     enough to have real findings. Not the product's own repo (hall of mirrors).

6. **Providers: API-first.** SP-2 smoke (`poc/sp2-api-smoke.mjs`) exercises the sealed worker
   on AnthropicProvider — the one de-risk test worth doing pre-repo (hamr: API only, skip
   local-LLM for now). Local LLMs remain a product requirement, deferred.

7. **The panel is the product's face** (not a lab viewer): define a job (task, per-step
   verdict classes, budget, cadence, worker tier), watch runs (chat = system↔operator incl.
   HITL prompts; grid = runs by generation/verdict; detail = spine stream), and the trust
   surface: **what has this lineage learned** — current rules, each with its minting green.
   Deferred until the new repo; the spine stays the single source so any UI is a pure observer.

## What the product must build that the experiment never had

close-authoring UX (describe a job → get an honest per-step close chain; predicate > GOLD
arbiter > rubric-advisory hierarchy per relayfact); job/schedule model (bareagent Scheduler,
budget per run via bareguard); multi-provider worker seam (SP-2); the panel; per-job channel
declarations; the primitive request-red registry.

## Post-SP-1 amendments (2026-07-10, F16 — supersedes the boundary-map framing above)

SP-1 completed after this doc was first written; two results amend the design directly:

1. **The payoff variable is regularity GUESSABILITY, not worker tier.** P1 held (haiku follows
   recalled conventions: fixed 1.00 at $0.046) but P2/P3 failed — haiku blind-grinds guessable
   conventions at the opus rate (0.80). The §7d boundary map is superseded (F16): inheritance
   pays where the environment's regularities are OUTSIDE iterative reach at the cap —
   idiosyncratic house rules, arbitrary internal conventions — for any worker above the
   competence floor. Product consequence: job #1's value driver is that real repos' folklore
   is mostly the unguessable kind; worker tier is a cost knob, not the capability knob.
2. **Verdict admits, contrast attributes — the extractor MUST see contrast evidence.** SP-1's
   gated-rules arm authored the working feature at g0, greened with it, and then LOST it,
   because a bare green carries no signal about which knob earned it when greens are cheap.
   The product's rule extractor receives the run's standing among siblings/history (green@1
   vs ground @3 vs capped), not just "green". This is a hard requirement, not a tuning choice
   — without it inheritance drifts and can shed working features (gated-rules finished worst).
   SP-3 (registered in F16, ~$6–8, unguessable-conventions probe) is the pre-repo test of the
   rewritten map plus this attribution fix; if inheritance still fails to lock WITH contrast
   present, the mechanism itself is in question.

## Open questions (deliberately unresolved until the new repo's PRD)

- Rules generalization: adaptlearn proved transmission within one task family; job #1 assumes
  lessons transfer across review-fix runs on one repo. First thing the product measures.
- Soft-green minting policy: HITL-confirm vs N-consistent — pick after job #1 data.
- SP-1 outcome folds in: if haiku is below the competence floor (P1), the cheap tier is
  sonnet-class and the curve needs a mid point; if P3 confirms, weak-worker capability is a
  headline product claim.
- Name. (Deliberately not brainstormed yet.)
