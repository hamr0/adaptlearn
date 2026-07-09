# adaptlearn — findings

No papering over. Every friction point — with bareagent / litectx / bareguard (filed upstream),
with the schema (an M3-class "can't express" is a finding, not a workaround), or with the ladder
(a module that can't exit stops the ladder; the stop is a result) — is logged here, grounded in
source (file:line) or in the event log (run + seq). "Works as intended" is also a finding.

Reds are logged through the PRD §5b lens: name which of the five meanings the contrast supports
(worker ceiling / bad harness / broken close / cap halt / schema can't express) — never a bare
count.

## F1 — litectx already ships the ops vocabulary (works as intended)

Schema v1's planned write · select · compress · isolate vocabulary already exists upstream:
litectx v0.27.0 exports `PRIMITIVES = ["Write","Select","Compress","Isolate"]`,
`VERBS_BY_PRIMITIVE` (remember/forget/write-gate · recall/impact · assemble/compress/
summaryWindow · stash/peek/evict/scope), and `COMPRESS_LEVELS` (`src/index.js` exports).
Schema v1 binds this catalog (v1 exposes a 4-verb subset) instead of inventing one.
**Verdict: consume, don't build — no invention needed.**

## F2 — bareagent clipipe reports no usage, though the claude CLI provides it (upstream)

`bareagent/src/provider-clipipe.js:67-68` — `toolCalls: []` always, `usage: {inputTokens: 0,
outputTokens: 0}` always. But `claude -p --output-format json` does return usage and cost
fields, so the provider could parse real token counts. Consequences absorbed in the schema v1
design: worker is tool-free, and local runs cap on bareguard's `counts` dimension (the gate
fails closed on unpriced cost — `bareguard/src/gate.js:573`). **Fix belongs upstream in
bareagent** (parse CLI JSON usage); until then, counts-capping is the honest workaround, logged
here per no-papering-over. (Extends relayfact F5, which established the no-tools limit.)

## F3 — `onLlmResult` is a Loop constructor option; on `run()` it is silently ignored (trap, works as documented)

probe-02 first passed `onLlmResult` to `loop.run(msgs, tools, opts)` — no error, no warning, and
the budget axis went completely blind: 4 iterations at ~$0.13 each sailed past a $0.02 cap, every
write allowed by `rule:"default"`. The adapter's own JSDoc example is explicit
(`bareagent/src/bareguard-adapter.js:103`): `new Loop({ provider, policy, onLlmResult })`.
**Verdict: works as documented, but the failure mode is silent and catastrophic for the budget
claim** — encoded as a comment in `src/interpret.js` and regression-covered by the cap-halt
interpreter test (a stub provider's costUsd must trip the gate). Possible upstream nicety:
`loop.run()` could warn on an unknown `onLlmResult` option. Not filed as an ask yet — the
constructor path is correct and sufficient.

## F4 — schema writeScope is glob-shaped; bareguard `fs.writeScope` is prefix-containment

`bareguard/src/primitives/fs.js` `within()` does directory-prefix matching (and `glob.js`
supports `*` only, for other primitives). A config entry `src/**` passed through verbatim is
treated as a literal directory named `src/**` — everything denied (fail-closed, correctly).
The interpreter maps the schema's trailing `/**`|`/*` to the directory prefix
(`src/interpret.js`). **Mid-path wildcards (`src/*/gen`) are not expressible at the enforcement
layer** — if a harness ever needs one, that's a schema/enforcement vocabulary gap to take
upstream, not a mapping to fudge locally.

**Resolved (2026-07-08, same day):** fixed upstream as UPSTREAM-ASKS A1 — `CLIPipeProvider`
`parse: 'claude-json'` maps `result`/`usage`/`total_cost_usd` onto `GenerateResult` (loud
`ProviderError` on malformed/`is_error`), and the Loop now prefers a finite provider `costUsd`
over `estimateCost`, so the CLI feeds bareguard's USD axis directly. Consumed via
`bare-agent@file:../bareagent`, verified live (both paths). Note for pricing: the CLI reports
real equivalent-API cost even on subscription (~$0.05–0.32 observed), and `model` can carry a
`[1m]` suffix. Counts-capping workaround dies at M2.
