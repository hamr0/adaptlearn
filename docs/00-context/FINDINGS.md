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
