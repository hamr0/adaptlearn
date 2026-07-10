```
                 ╭───────────────────────────────────────╮
                 │       a d a p t l e a r n             │
                 │                                       │
                 │    author ──→ run ──→ verify          │
                 │      ↑                   │            │
                 │      └──── inherit ←─────┘            │
                 ╰──╮────────────────────────────────────╯
                    ╰── the harness that learns

```

<p align="center">
  <img src="https://img.shields.io/github/package-json/v/hamr0/adaptlearn?label=version&color=2a4f8c" alt="version (auto from package.json)">
  <img src="https://img.shields.io/badge/license-Apache%202.0-2a4f8c" alt="license: Apache 2.0">
  <img src="https://img.shields.io/badge/status-ARCHIVED%20·%20claim%20vindicated%20post--archive-2a7a4f" alt="status">
</p>

**An experiment: can an agent's *harness* — not its plan, not its code — be an emergent artifact that improves across runs?**

Everyone hand-tunes their agent's setup: what it recalls before working, how many retries it
gets, when it saves notes. adaptlearn asks whether that setup can *evolve* — run an agent,
keep what worked, pass lessons to the next run — under one hard rule: **only proven successes
(real test passes) earn the right to pass anything on.** Manus-class systems rewrite the plan
inside a fixed harness; this probes one level up: the harness file as a runtime output.

Assembled entirely from the bare suite ([bareagent](https://github.com/hamr0/bareagent),
[litectx](https://github.com/hamr0/litectx), [bareguard](https://github.com/hamr0/bareguard));
builds no primitives. Sibling of [relayfact](https://github.com/hamr0/relayfact), which
settled the grounded-loop question this experiment stands on. Like relayfact, it either
**graduates or gets archived** — the bar is the point.

---

## The idea in plain terms

Picture a tournament between four ways of configuring a coding AI. Each round brings a small
coding task with hidden house rules — rules written on notes filed in a drawer (a memory
store) that nobody checks by default. The test suite is the referee, and it reports only
`2 of 7 tests failing` — never which ones, never why.

Learning, here, means one concrete thing: **figure out which drawer the house rules live in,
and tell your successors.** One team inherits nothing each round; one inherits its winning
config verbatim; one inherits distilled *rules* extracted from wins — but only from runs the
referee actually greened. Nothing an agent merely *claims* gets inherited.

Three design rules keep it honest:

- **The agent authors its harness; it never authors its arbiter.** The outer loop is ~50
  lines of deliberately dumb stdlib — `while tests-red && under-budget: run the agent` —
  outside everything the agent can touch. Its stupidity is the security model.
- **The harness is a validated form, not freeform code.** Bad configs are rejected before a
  token is spent; the pass/fail judgment is not expressible in the form at all.
- **Green gates, cost ranks.** Pass/fail decides what may be inherited; speed and cost only
  break ties. Efficiency never negotiates with truth, and improvement is nobody's in-loop
  goal — anything optimizable inside the system would be optimized against.

## What happened

The ladder held, rung by rung — each module proved its riskiest assumption before the next
(M0 referee → M1 schema → M2 interpreter → M3 "is the dial even connected?" kill-switch →
M4 AI-authored configs at parity → M5 mid-run revision rescuing stuck runs). Then the main
event, M6, ran three times:

| Attempt | What the instrument did | Lesson |
|---|---|---|
| 1 | Every arm scored ~perfect instantly — the task description itself taught too much | Every information path into the worker is part of the instrument |
| 2 | Failing tests *named* what was wrong; losing teams got the answers spoon-fed by retry 3 | The exam was leaking — same lesson, second channel |
| 3 | Opaque referee (`2 of 7 failing`, nothing more) — the measurement finally held | See below |

**What worked — the mechanism, twice.** Under the honest instrument, configs that recalled
the right drawer went green on the *first attempt* 80% of the time; configs that didn't:
**0% in 44 tries.** And one rules-inheriting lineage ran the entire hoped-for loop end to
end, in both real attempts independently: struggle blind for four rounds → discover the
drawer → pass first-try → the extractor writes "recall episode-kind notes" into the inherited
rules → every later round passes first-try at ~10× lower cost. Discovery, verification,
codification, transmission, stable expression.

**What didn't — the headline claim.** On the one pre-registered scoreboard (pass/fail), the
inheriting arms never beat the non-inheriting one (late-half green rates: ungated 0.88,
gated-rules 0.88, gated-verbatim 0.75). With the leak closed there was nothing left to blame
except the worker itself: an Opus-class model *guesses* typical house conventions within
three blind attempts ~73% of the time, given nothing but a failure count. Memory couldn't
decide whether you pass — only whether you pass instantly and cheaply, and those axes were
barred (by our own pre-registered rules, because they're ~10× noisy) from carrying the claim.

**The boundary map** (the actual scientific result): *verdict-gated harness inheritance is
masked wherever the environment's hidden regularities lie within the worker's guessing reach
at the given retry cap.* Informative test output and strong workers are two instances of the
same masking. The regime where inheritance should become load-bearing on truth, not just
cost: **weaker or cheaper workers, tighter budgets, and regularities a model can't guess.**

**The verdict: ARCHIVED** (2026-07-10, v0.10.0) — by the rule this experiment set for itself
before it started. The bar was pass/fail separation under an honest instrument; three attempts
exhausted every excuse; the gate didn't separate. The mechanism works, the claim is *bounded*
rather than proven, and the boundary is the deliverable.

## Epilogue — the post-archive probes vindicated the claim (v0.11.0)

The archive verdict said "nothing left to blame." A same-day post-archive probe track
(F16–F20, ~$45, the record never reopened) found there *was* something left to blame — and it
was ours all along.

**The real masker was in-run acquisition.** Every run carried a mid-run revisor (M5) and a
note store seeded with the answers. Blind configs didn't guess the house rules and didn't
need inherited memory: they failed twice, *rewrote their own config to recall the notes*, and
passed on attempt three — inside every single run, in every cohort. The spine evidence is
unambiguous (fail → fail → revise-to-recall → hits jump → pass), and re-reading the archived
worlds with that lens showed "worker prior" (attempt 3) and "guessability" (SP-1) were two
misattributions of this one mechanism. Ashby's two-loop diagnosis: the fast loop (within-run
fixing) absorbed everything the slow loop (cross-run inheritance) was supposed to learn — so
the scoreboard could never see the slow loop at all.

**Attempt 4 (F19): revision off, unguessable conventions — the first valid instrument.** The
result, pre-registered and categorical: **gated arms late 1.00 (both representations),
ungated late 0.13.** Failures never enter a gated lineage; greens lock. Ungated dragged its
failed config forward verdict-blind for eight generations and never escaped. **The archived
claim was masked, not false** — verdict-gated inheritance beats ungated on the one scoreboard
this project allowed, once its own machinery stops handing every arm the answer.

**And the fix for the credit-loss problem (F20):** inherit the config a run *ended* with
(post-revision) instead of the one it *started* with, and in-run learning survives into the
lineage — 6/6 lineages transmitted across the exact boundary where it always died before, at
roughly half the cohort cost. That mechanism — run-as-executed inheritance, verdict-gated,
with ledger-counted contrast attribution — is the core of the successor product this repo's
findings now seed.

A footnote for the curious: the diagnosis was materially helped by 1948–1972 cybernetics
(Ashby, Conant, Beer), mapped in
[docs/00-context/CYBERNETICS.md](docs/00-context/CYBERNETICS.md) — including the
pre-registered reading rule that stopped us from mis-concluding a second time.

Full numbers, prediction scorecards, and the no-papering-over log:
[docs/00-context/FINDINGS.md](docs/00-context/FINDINGS.md) (F1–F20). Governing spec:
[docs/01-product/adaptlearn-prd.md](docs/01-product/adaptlearn-prd.md) (v1.5.5, closed —
archive verdict in §7d, vindication note at the top). Successor seed:
[docs/01-product/successor-product-prd-draft.md](docs/01-product/successor-product-prd-draft.md).

---

## How it's put together

Three layers, strictly separated:

| Layer | What | Who owns it |
|---|---|---|
| **Ralph shell** | `while tests-red && under-cap: run the middle` — close, gate, cap, escalation. Stateless across runs | Never the agent |
| **Harness config** | Schema-v1 JSON: recall kinds/k, loop shape, retry cap, memory hooks, write scope, escalation wiring. Validated before tokens burn | Authored by the agent, one per run |
| **Worker** | The sealed coding agent (bareagent Loop + CLI provider), seeing only: task, its config's recalled notes, opaque gap counts | — |

Between runs: a one-knob mutation catalog, verdict-gated rule extraction, and per-arm
inheritance. Everything lands on an append-only JSONL spine; every run is hash-verified
replayable (`--resume` completed a $18 cohort across a provider outage without re-spending a
cent on finished rows).

```
src/            ralph.js (the dumb shell) · validate.js · interpret.js · author.js
                revise.js · mutate.js · extract.js · cohort.js · spine.js
poc/            throwaway launchers — m6 tasks, cohort runner, opaque close
docs/           PRD (locked, amended by explicit edits only) · FINDINGS (the log) · designs
tests/          117 tests, token-free
```

Nothing here is a library to install. It's an experiment record: the code is real and runs,
but the deliverable is the findings, the doctrine they earned (pre-registered predictions,
declared information channels, contrast-first red-reading), and the boundary map.

## The bare ecosystem

adaptlearn consumes, and files findings upstream to:

- **[bareagent](https://github.com/hamr0/bareagent)** — the think→act→observe loop (sealed worker, providers, HaltError)
- **[bareguard](https://github.com/hamr0/bareguard)** — the single gate: budget cap, write scope, audit
- **[litectx](https://github.com/hamr0/litectx)** — the memory store whose `kind` partitions are the drawers in the story

## License

Apache License, Version 2.0 — see [LICENSE](LICENSE).
