# Stash: adaptlearn born (PRD locked+published) + Hebbian/adaptive-engineering learnings → LOCAL_INTELLIGENCE

**Date:** 2026-07-08 (evening session; follows same-day kNN-retrieval stash)
**Repos touched:** `hamr0` (LOCAL_INTELLIGENCE.md, 4 commits) and **new repo `adaptlearn`** (2 commits, published). relayfact itself: no code changes — served as the settled-results source.

## Arc

Conceptual Q&A (JEPA / embeddings-not-truth / floodlight-vs-spotlight / Alan Watts' net) →
Hebbian relatedness → user caught the recall≠use loophole → adaptive-engineering talk
(Chandegra) → decision to start a sibling experiment → **adaptlearn PRD v1.1 locked and
published at github.com/hamr0/adaptlearn**.

## LOCAL_INTELLIGENCE.md additions (hamr0 repo, all generic per doc discipline)

Commits 91c148e, b139cfc, 9c86f29, 6666a72 — six new §1 entries:
1. **Featural vs relational similarity (analogy gap)** — Gentner structure-mapping; PM→cooking never surfaces via cosine; ways past it: relatedness-from-use + truth-from-consequences.
2. **Spotlight vs floodlight** — attention=concentration operator; floodlight analogues live OUTSIDE the model: scheduled consolidation, spreading activation, idle-time dreaming.
3. **Hebbian association** — decay (ACT-R base-level) / bounded weights (Oja) / anti-Hebbian / STDP; then AMENDED after user caught **recall ≠ use**: the edge condition is the conjunction **surfaced ∧ evidence-of-use ∧ validated outcome** (= neuroscience's **three-factor rule + eligibility traces**; dopamine = the verdict). Use-evidence ranked: failure-transition > artifact overlap > self-citation. Recall-only edges just re-learn the ranker's closeness bias.
4. **Stigmergy** — coordination through environment traces (event log/store = the medium), no protocols.
5. **Emergent coordination & arbiter placement** — emergence is safe only where consequences are real/unfakeable (physics is the flock's arbiter); law: **let the middle emerge, never the arbiter**; caps = selection pressure; emergence needs population+iteration+retained selection.
6. **Plan-in-latent-space & the arbiter gap** — JEPA/MuZero borrow chess's *search* but can't borrow its *arbiter*; latent prediction error = surprising, not false.

## adaptlearn — the new experiment (github.com/hamr0/adaptlearn, public, Apache-2.0, master)

**Question:** can the *harness* (not plan, not code) be an emergent artifact that improves across runs? (Manus-class = plan-rewriting inside fixed harness; adaptlearn probes one level up.)

**PRD v1.1 LOCKED** at `docs/01-product/adaptlearn-prd.md` (commits 47a87f5 root, e0cd360 v1.1). Key locked decisions (user chose via questionnaire):
- **Primary claim = cross-run adaptation**: verdict-gated harness inheritance shows a learning curve; **falsifier = ungated/random-inheritance control** — if it matches gated, the claim DIES.
- **Harness artifact = constrained config (schema v1)**, not freeform code; required fields (gate+write-scope, memory, escalation) or validation reds before tokens burn; the close is NOT expressible in the config (shell owns it). Schema-too-rigid ⇒ finding + explicit v2, never silent widening.
- **Task domain = relayfact's** (single JS fn, oracle+GOLD/repo mode) — fixed pipe = free validated control arm.
- **Inheritance = rules-vs-verbatim sub-experiment** (two gated arms in M6). Budget **$2/run cap, ~$50 ladder**. Public from day one.

**Shape (3 layers):** dumb **Ralph shell** (stdlib, `while close-red && under-cap`; holds arbiter+budget; too dumb to be gamed; stop=executable not vibes) → **emergent middle** (agent authors harness-as-config, revises mid-run on failed close) → **stigmergic floor** (JSONL spine — pattern copied from relayfact, checks all boxes; litectx store).

**Doctrine baked into PRD:**
- Within-run: **stop at first green** (tuning past visible close = fit-to-pass surface). Across-run: selection on cost among greens; **one-knob mutation** (attribution cleanliness); mutant must stay green + dominate cost.
- **Green gates, cost ranks — never one fitness score** (efficiency must not negotiate with truth).
- **Three-tier goals:** human-set/fixed (task+close+cap), agent-set/fluid (harness), **nobody-set/emergent (improvement)**. Ralph stateless across runs; only the store differs between run N and N+1; learning curve = observer reading, never in-loop target.
- **§5b Reading a red:** 5 meanings (worker ceiling / bad harness / broken close→escalate / cap-halt="not under $2" own category / schema can't express). Meaning from CONTRAST. Asymmetry: reds never mint inheritance, but steer mutation. Decision-ready escalation = truthful terminal; every run in denominator.
- **Module ladder M0–M6** (each POCs → graduates → stands alone; token-free first): M0 shell+spine, M1 schema+validator, M2 interpreter, M3 **contrast check = keystone/kill-switch** (two opposed hand-configs MUST differ measurably or the schema has no wired-in variable → STOP), M4 agent authorship (parity gate), M5 mid-run revision, M6 inheritance+selection (the claim). Module can't exit ⇒ ladder stops; stop is a result.

## Open items (next sessions, in order)

1. **Schema v1 design pass** — ops vocabulary (write·select·compress·isolate + loop shape + memory policy); M3 contrast check is its acceptance test. Blocks M1+.
2. **adaptlearn CLAUDE.md** — copy AGENT_RULES stub + adaptlearn doctrine (before schema session).
3. **Seed `docs/00-context/FINDINGS.md`** in adaptlearn.
4. **Then M0** (Ralph shell + spine, token-free, probe-01 shape: noop middle → red, cap halt, decision-ready escalation).

## Key insights worth remembering

- **Ralph Wiggum shell:** the outer loop's *stupidity is the security model* — nothing inside can negotiate with it; upgrades over actual Ralph: executable stop condition + deliberate stigmergy.
- The three-factor rule unifies the session: memory edges AND harness inheritance use the same conjunction (surfaced ∧ used ∧ green) — ungated learning learns fit-to-pass.
- relayfact's spine qualifies as reference spine (append-only, stamp-last, stdlib, pure listeners, ABSENT-not-fabricate); **copy the pattern not the code**; extract to lib only on a third consumer.
- The parked turn-aware injector (#4, harness-bound) becomes scaffoldable inside adaptlearn — we'd own that harness.
