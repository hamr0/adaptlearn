# Schema v1 — harness-as-config design (validated 2026-07-08)

> Design pass for the PRD §7 open work item. Governed by `docs/01-product/adaptlearn-prd.md`
> (LOCKED v1.1); the M3 contrast check is this design's acceptance test. Doctrine: lightweight
> and constrained — every exclusion is a named v2 candidate, re-admitted by finding, never by
> silent widening.

## Decisions (user-validated, in order)

1. **Config shape: hybrid** — declarative policy knobs + 3 fixed hook slots where the agent may
   insert catalog ops. Interpreter owns all control flow outside the slots.
2. **Loop menu: `refine` | `plan`** (bareagent `refine` / `runPlan`). ~~recurse-1~~ cut for v1 —
   cost-open, heaviest interpreter work, nothing to decompose in a single-function task domain.
3. **Hook slots: 3** — `before-attempt`, `after-red`, `on-green`; ≤ 2 ops per slot.
4. **One-knob mutation = one JSON path.** `diffPaths(parent, child)` must equal exactly 1
   (a dial, or one op added/removed/swapped in one slot, or one param of one op). Machine-checked
   before the mutant runs; the changed path is stamped into the run's spine header.
5. **Verb catalog: 4** — `recall`, `compress`, `stash`, `remember` (`remember` legal ONLY in
   `on-green`, so retention is verdict-gated by construction). The vocabulary binds litectx's
   exported `PRIMITIVES`/`VERBS_BY_PRIMITIVE` (Write·Select·Compress·Isolate — already upstream);
   v1 exposes this subset.
6. **Provider is shell-owned, never a schema field** (arbiter-adjacent). The Ralph shell binds
   any bareagent provider — `clipipe` (local claude CLI, zero marginal cost) for M2–M5 dev,
   API (`anthropic`/`openai`/`gemini`) or `ollama` where the run needs real metering (M6 cohort).
   Consequence: the worker is **tool-free** — it emits the artifact as text; the interpreter
   writes it to disk inside `gate.writeScope` (clipipe has no tool support: relayfact F5).
7. **Cap dimension matches the provider** (bareguard gate has `costUsd` / `tokens` / `counts`
   axes and fails closed on unpriced cost): `counts` (calls/iterations) for clipipe, `tokens`
   for ollama, `$2 costUsd` for APIs. Cost-to-green on local runs is measured in
   iterations/tokens — same selection pressure, different unit.

## The config document

One JSON file, `harness.json`:

```json
{
  "schema": "v1",
  "loop":   { "shape": "refine", "maxIterations": 4 },
  "memory": {
    "store": "litectx",
    "recall": { "k": 5, "kinds": ["fact", "episode"] },
    "compressLevel": "signature"
  },
  "hooks": {
    "before-attempt": [ { "op": "recall", "k": 8 } ],
    "after-red":      [ { "op": "stash" } ],
    "on-green":       [ { "op": "remember", "kind": "fact" } ]
  },
  "gate":       { "budgetUsd": 2.0, "writeScope": ["src/**"] },
  "escalation": { "mode": "decision-ready" }
}
```

- **Required (config reds without them, before tokens burn):** `schema`, `loop.shape`,
  `memory.store`, `gate.budgetUsd` (>0, ≤ shell cap — the agent may tighten its leash, never
  loosen it; the shell's cap binds regardless), `gate.writeScope` (non-empty),
  `escalation.mode: "decision-ready"`. These are PRD §2's non-negotiables.
- **Free axes (emergence lives here):** `loop.shape`, `maxIterations`, `recall.k`/`kinds`,
  `compressLevel`, contents of the three slots.
- **Deliberately absent:** the close (shell-owned; a config field naming/weakening it is an
  unknown-field red) and the provider (shell-owned, decision 6).

## The interpreter

Only code that reads a config. Composes, never invents:

- **Setup (token-free):** validate → bind litectx store → construct bareguard `Gate`
  (clamped to shell cap, dimension per decision 7) → `wireGate`.
- **Dispatch:** `loop.shape` → bareagent `refine` or `runPlan`. Worker = bareagent `Loop`,
  shell-bound provider, **no tools**; receives task + assembled context, emits artifact text;
  interpreter writes it (inside writeScope or gate red). The shell runs the close and feeds the
  verdict back.
- **Hooks:** `before-attempt` shapes worker context (recall → compress → context string);
  `after-red` runs on failed close with the gap text available (stash/recall); `on-green` runs
  once after the shell confirms green (the only `remember` site).
- Every op invocation, gate decision, and write is an event on the JSONL spine — attribution is
  read off the ledger.

## Validation (M1)

Deterministic predicate, stdlib only (~150 lines, no JSON-Schema lib). Every failure a
distinct named red on the spine (`config-red: missing-required:gate.writeScope`). Order:

1. **Shape:** parses; `schema: "v1"`; no unknown top-level fields (smuggled `close`/`provider`
   reds here).
2. **Required bindings** (list above).
3. **Bounds:** `maxIterations` 1–8; `recall.k` 1–20; `compressLevel` ∈ litectx
   `COMPRESS_LEVELS` (verbatim/signature/drop); ≤ 2 ops per slot.
4. **Verb legality:** ops ∈ {recall, compress, stash, remember}; `remember` only in `on-green`;
   params match verb arity.

Mutation legality (M6) is `diffPaths` = 1, checked by the same validator. M1 ships a fixture
pair per named red plus one valid fixture; each fixture must be able to fail.

## M3 acceptance test (the kill-switch)

Two hand-authored opposed configs, same task/shell/provider:

- **MAX:** `refine`, maxIterations 8, recall k=20 both kinds, `verbatim`, all slots populated.
- **MIN:** `plan`, recall k=1, `drop`, all slots empty.

Exit: on ≥1 task a **categorical** difference first (verdict, or iterations-to-green), not a
dollar delta (cost is ~10× noisy). Identical outcomes on every probe task ⇒ variable not wired
in ⇒ STOP the ladder, redesign the schema (finding, not tweak).

## Failure map (§5b applied to schema machinery)

| Failure | Category | Handling |
|---|---|---|
| Config fails validation | config red | own category, zero tokens, never a harness result |
| Op throws at runtime (store missing, litectx error) | interpreter red | escalate; never masquerades as bad-harness |
| Write outside scope / cap hit | gate red / cap halt | own categories on the spine |
| Close fails | worker red | the only red that feeds `after-red` and steers mutation |

## v2 candidates (named exclusions — re-admitted by finding only)

- `recurse-1` loop shape (decomposition; needs top-node-only close handling per relayfact
  F12–F14)
- Verbs: `impact`, `peek`, `summaryWindow`, `assemble`, `forget`/`evict` (destructive),
  `scope` (isolation-as-knob instead)
- Op ordering beyond slot boundaries; conditional logic inside slots; per-step memory policy in
  `plan` mode; run-start / run-end slots
- Freeform code-mode (PRD §3.8's explicit trigger)

## Upstream finding filed

bareagent `provider-clipipe` reports `usage: {0,0}` and supports no tools, but
`claude -p --output-format json` does return usage/cost — parsing it would give real token
metering on local runs. Filed in `docs/00-context/FINDINGS.md`; fix belongs upstream in
bareagent, not here.
