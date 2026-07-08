# adaptlearn — upstream asks

PRD §3.5 doctrine: no papering over a lib gap — log the finding, specify the ask here, fix it
upstream, consume the fixed version, continue. One entry per ask; status tracked in place.

## A1 — bareagent `CLIPipeProvider`: parse structured CLI output (usage + cost)

**Status:** ✅ CONSUMED (2026-07-08) — adaptlearn depends on `bare-agent@file:../bareagent` (the
house pattern, same as relayfact) and verified the fix live through the shipped provider:
success path (`text:"OK"`, non-zero usage incl. cache tiers, `model:"claude-opus-4-8[1m]"` with
the documented suffix, authoritative `costUsd`) and the loud-error path (non-JSON stdout →
`ProviderError`, no silent fallback). FINDINGS F2 resolved; the counts-capping workaround dies
at M2 — local runs cap on real USD. Asked and fixed same day.
**Finding:** FINDINGS.md F2. **Repo:** `bareagent` (`src/provider-clipipe.js`, `src/loop.js`, `types/index.d.ts`).

### Delivered (exactly as asked)

- `new CLIPipeProvider({ parse: 'claude-json' })` — opt-in; default (unset) stays raw-text/zero-usage
  (byte-identical, regression-guarded). A `parse: (stdout) => Partial<GenerateResult>` **function** is
  the CLI-agnostic escape hatch; `'claude-json'` is a shipped preset over it (your alternative accepted).
- Mapping onto `GenerateResult`/`Usage`: `text ← result`, `usage.{input,output}Tokens`,
  `cache{Read,Creation}Tokens` (absent ⇒ **omitted**, per Usage docs), `model ← ` first `modelUsage`
  key, `costUsd ← total_cost_usd`. Malformed JSON / non-object / `is_error` / non-`success` subtype →
  **loud `ProviderError`**, never a silent raw-text fall-back.
- **The cost axis actually enforces now:** `GenerateResult` gains optional `costUsd?: number` AND the
  **Loop prefers a finite `result.costUsd` over `estimateCost`** (both main + summarize cost paths),
  forwarding it to `onLlmResult` as `pricing:'priced'`. A CLI whose `model` has no local rate table
  therefore feeds bareguard's USD axis directly — this is the part that kills your `counts`-capping
  workaround. A provider-supplied `0` is a valid priced value (marginal-$0 subscription run), distinct
  from omitted/null (which falls back to the rate table). *(Note: item 4 asked to "surface" cost; the
  complete fix also required the Loop to honor it, else `costUsd` is dead weight when model is null.)*
- Acceptance met: 11 fixture unit tests (success mapping, is_error, non-success subtype, malformed &
  non-object JSON, absent-cache-omitted, missing-model→null, `costUsd:0`-priced, function-parser merge,
  no-parse regression, end-to-end routing) + 3 Loop tests (provider-cost preference, 0-is-priced,
  non-finite-falls-back) — all able to fail. **Live smoke** through the shipped provider on the real
  `claude -p "say OK" --output-format json`: `text:"OK"`, `inputTokens` > 0, authoritative `costUsd`
  surfaced. CHANGELOG + JSDoc done.

### Two implementation notes for your consume step

- `modelUsage` in the real 2.1.204 envelope is an **object keyed by model id** (e.g.
  `{"claude-opus-4-8[1m]": {...}}`), so `model` is the first key — it can carry a `[1m]` context-window
  suffix. If you price off `model` downstream, expect that suffix; `costUsd` is unaffected (taken from
  `total_cost_usd` directly).
- The live CLI reports a real *equivalent-API* cost even on a subscription (~$0.05–0.32 in smokes), not
  $0 — so your USD cap will see genuine non-zero spend, not a marginal $0. Size the cap accordingly.

### The gap (grounded)

`provider-clipipe.js:65-69` — `generate()` returns stdout verbatim as `text` and hardcodes
`usage: { inputTokens: 0, outputTokens: 0 }`. But the claude CLI, invoked as
`claude -p --output-format json`, emits a single JSON object on stdout that carries everything
a provider result needs (verified live 2026-07-08):

```json
{
  "type": "result", "subtype": "success", "is_error": false,
  "result": "OK",
  "total_cost_usd": 0.0846,
  "usage": {
    "input_tokens": 5317,
    "output_tokens": 4,
    "cache_read_input_tokens": 15197,
    "cache_creation_input_tokens": 5034
  },
  "session_id": "…", "stop_reason": "end_turn", "num_turns": 1
}
```

Consequence downstream: a bareguard `Gate` with a token or USD cap sees zero usage from clipipe
runs — the budget axis is blind (and fails closed on unpriced cost under an active USD cap,
`bareguard/src/gate.js:573`). adaptlearn currently works around this by capping on the
`counts` dimension for local runs; under PRD §3.5 that workaround should die once this lands.

### The ask (exact)

Add an opt-in structured-output mode to `CLIPipeProvider` — suggested option:

```js
new CLIPipeProvider({
  command: 'claude',
  args: ['-p', '--output-format', 'json'],
  parse: 'claude-json',        // opt-in; default stays raw-text (no behavior change)
})
```

When `parse: 'claude-json'` is set, `generate()` must:

1. `JSON.parse` the trimmed stdout. Not valid JSON → **`ProviderError`** (loud), never a silent
   fall-back to raw text — the caller explicitly asked for structured output.
2. `is_error: true` or `subtype !== "success"` → **`ProviderError`** carrying `result`/subtype.
3. Return, mapped onto the existing `GenerateResult`/`Usage` shape (`types/index.d.ts:16,77`):
   - `text` ← `result` (the assistant text, NOT the raw JSON envelope)
   - `usage.inputTokens` ← `usage.input_tokens`
   - `usage.outputTokens` ← `usage.output_tokens`
   - `usage.cacheReadTokens` ← `usage.cache_read_input_tokens` (absent → omit, per Usage docs)
   - `usage.cacheCreationTokens` ← `usage.cache_creation_input_tokens` (absent → omit)
   - `model` ← `modelUsage` key if present, else `null`
4. Surface `total_cost_usd`: suggest an optional `costUsd?: number` on `GenerateResult` — the
   CLI's own price is authoritative (subscription runs report it even when the marginal cost to
   the user is $0), and it feeds bareguard's `costUsd` budget axis without a pricing table.

Out of scope for A1 (explicitly): tool support (`toolCalls` stays `[]` — adaptlearn's worker is
tool-free by design), streaming, and any claude-specific default args. A generic
`parse: (stdout) => Partial<GenerateResult>` callback variant is equally acceptable if
bareagent prefers to stay CLI-agnostic; `'claude-json'` can then be a shipped preset built on it.

### Acceptance (each must be able to fail)

- Unit tests on fixture stdout strings (no real CLI): success envelope → mapped
  text/usage/costUsd; `is_error` envelope → ProviderError; malformed JSON → ProviderError;
  no `parse` option → byte-identical behavior to today (regression guard).
- One live smoke (manual, `real_api`-style): `claude -p "say OK" --output-format json` through
  the provider returns `text: "OK"`-ish with non-zero `usage.inputTokens`.
- CHANGELOG + JSDoc on the new option.

### adaptlearn consumes it by

Switching the M2+ shell provider binding for local runs from counts-capping to real
token/cost capping, and deleting the F2 workaround note.
