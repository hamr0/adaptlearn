# adaptlearn — upstream asks

PRD §3.5 doctrine: no papering over a lib gap — log the finding, specify the ask here, fix it
upstream, consume the fixed version, continue. One entry per ask; status tracked in place.

## A1 — bareagent `CLIPipeProvider`: parse structured CLI output (usage + cost)

**Status:** OPEN (asked 2026-07-08). Blocks nothing yet; wanted before M2 first live run.
**Finding:** FINDINGS.md F2. **Repo:** `bareagent` (`src/provider-clipipe.js`).

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
