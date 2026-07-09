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

## F5 — validator/runtime kind mismatch: litectx `remember()` is narrower than `KINDS`

Found while closing the negative-scenario audit: the validator checked `remember.kind` against
litectx's full `KINDS` (`code|doc|fact|episode`), but `litectx remember()` throws on anything
outside `fact|episode|doc` (`src/index.js:789` — code enters via `index()`). A config with
`remember.kind:"code"` validated green, then crashed at the worst moment — *after* a green
close, in the on-green hook. Two-sided fix: validator narrowed to `fact|episode` (v1 also gates
the doc/upload axis out), and on-green hook failures now degrade loudly instead of crashing —
`retention-red` on the spine, green outcome stands, that green mints no inheritance.
**Lesson: binding an upstream vocabulary (F1) still requires checking each verb's own contract —
the export you bind can be wider than the function you call.**

**Resolved (2026-07-08, same day):** fixed upstream as UPSTREAM-ASKS A1 — `CLIPipeProvider`
`parse: 'claude-json'` maps `result`/`usage`/`total_cost_usd` onto `GenerateResult` (loud
`ProviderError` on malformed/`is_error`), and the Loop now prefers a finite provider `costUsd`
over `estimateCost`, so the CLI feeds bareguard's USD axis directly. Consumed via
`bare-agent@file:../bareagent`, verified live (both paths). Note for pricing: the CLI reports
real equivalent-API cost even on subscription (~$0.05–0.32 observed), and `model` can carry a
`[1m]` suffix. Counts-capping workaround dies at M2.

## F6 — litectx stash is never recallable, so v1's `stash` verb cannot influence worker context (works as intended; schema vocabulary gap)

Found designing the M3 probe: litectx is explicit that a stash is outside ranked retrieval —
"recall owns ranked retrieval over memory; a stash is a dumb keyed blob, so `peek`" is its only
read-half (`litectx/src/index.js:994-1019`; separate `stash` table, `src/store.js:226`). Upstream
this is **works as intended**. The consequence lands in schema v1: the `after-red → stash` op
parks the gap, but no v1 verb ever reads it back — `recall` can't see it and `peek` is a named
v2 exclusion. So in v1, `stash` is **write-only decoration**: it can never change what the worker
sees, within a run or across runs. Two implications, both design-level, nothing to fudge locally:

1. **Within-run, the memory axes (`recall.k`, `compressLevel`) are inert on a fresh store** —
   there is nothing to recall until something has been `remember`ed, and `remember` is on-green
   only. A contrast probe must pre-seed the store (identically per arm — simulating run-N
   retention, exactly the axis the schema claims to wire) or it measures loop-shape alone.
2. This is the concrete finding that would re-admit `peek` in v2 (design doc names it as an
   exclusion): if a harness is ever to *use* its parked gaps, the read-half must enter the verb
   set. Not filed upstream — the gap is in our vocabulary subset, not in litectx.

## F7 — M3 contrast check: PASSED — categorical difference on verdict (the variable is wired in)

Live run 2026-07-09 (`poc/probe-03-contrast.mjs`, local claude via clipipe): the design doc's
MAX/MIN pair (opposed on exactly 8 JSON paths, machine-checked; gate/escalation identical), same
task, same GOLD close, same shell caps (capRuns 4, $2), same identically pre-seeded store (two
house-convention prose notes + one decoy; the close tests conventions the task statement
understates — case-insensitive units, bare-number-means-ms, RangeError/TypeError rules).

| arm | outcome | iterations | recall hits | ~cost |
|---|---|---|---|---|
| MAX | **green** | 1 | 3 | $0.11 |
| MIN | **escalated** (cap-halt 4/4, close red throughout) | 4 | 0 | $0.99 |

**§5b reading:** same task + same worker + same shell, different harness → green vs escalated ⇒
harness implicated, on the strongest (verdict) axis; M3's exit is "≥1 task", met. MIN's terminal
is honestly cap-halt ("not under cap"), and the contrast licenses the bad-harness reading. The
causal channel is visible in MIN's iteration 3: valid code that passed the generic tests and
failed *exactly* the understated house conventions the seeded notes carried — the notes, not
luck, explain MAX@1. MIN's other reds (prose-wrapped artifact ×2, quoting bug) are worker
instability, shared by both arms, not a confound. No interpreter-red anywhere: the plan path
(decompose + implement per iteration) ran clean all 4 iterations.

**Sealed reproduction (same day):** after F8 sealed the worker binding (tools disallowed, cwd an
empty sandbox, no CLAUDE.md contamination), the probe re-ran end-to-end: MAX **green @ 4**
(~$0.32; iter 1 real code missing part of the house contract, iters 2–3 syntax fumbles, iter 4
green; recall surfaced the seeds every iteration) vs MIN **escalated** cap-halt 4/4 (~$0.45).
Categorical difference on verdict reproduced under a strictly cleaner worker. Note the recurring
worker failure mode across all runs and both arms: template-literal-adjacent syntax errors in
emitted files — shared noise, no contrast confound, but it inflates iterations-to-green; worth
a dedicated look if it persists into M4.

**The two runs as a 2×2 (why verdict, not iterations, is the load-bearing axis):** within-config,
verdict was stable (MAX green 2/2, MIN cap-halt 2/2) while iterations-to-green varied wildly
within MAX (1 → 4 across runs — as large as any plausible MAX-vs-MIN iteration gap). So at n=1,
an iterations-to-green "categorical difference" (which design §M3 permits) would NOT have been
trustworthy — worker fumbles alone can produce it. M3's pass rests on the verdict axis, which
doubled as its own repeated-measures control. MIN's spine also shows the mechanism converting
iterations into verdict: whack-a-mole — it fixed the two note-carried conventions the gap named
(iters 1,3 → 4) only to red on the remaining two (error contracts), i.e. it was *converging* and
the cap halted it: cap-halt as "not under cap", never "can't", with the harness deciding how many
iterations the same cap must buy.

**Falsifier run (`poc/probe-03b-unseeded-control.mjs`, same day):** the causal reading was put
under intervention — MAX config, EMPTY store, everything else identical, n=2, primary metric
first-attempt convention compliance (robust to the iteration noise above). Result: unseeded MAX
**escalated cap-halt 4/4 in both runs**, first attempts missing 2 note-carried conventions each —
the exact MIN signature. Across all six live runs the partition is clean: recall surfaced the
seeds → green (2/2, first-attempt misses 0–1); recall surfaced nothing — whether because the
store was empty (unseeded MAX) or the slots were (seeded MIN) → cap-halt (4/4, misses 2 every
time). Two consequences:
1. **Confirmed by intervention:** the recall→context channel is causal, not spine forensics.
   This is also direct evidence-of-use in the PRD §4 retention sense.
2. **Honest narrowing:** with the store empty, MAX's remaining machinery (refine shape, slot
   mechanics) rescued nothing — unseeded MAX ≈ MIN on every measure. The schema variable
   *demonstrably* wired in is memory-surfacing specifically; loop shape showed no detectable
   effect at this n. M3's exit is unaffected (a wired variable exists), but M6 selection should
   expect the memory axes to carry the signal and shape mutations to be near-neutral on this
   task family until shown otherwise.

**Honest bounds:** n=1 task, one run per arm per condition — what M3 needed and no more. The demonstrated
variable is the *joint* MAX−MIN axis (slots + recall + shape together); per-knob attribution is
M6's one-knob-mutation job, not M3's. Also note MIN's `recall.k:1`/`drop` were never *executed*
(its slots are empty — opposition holds at the config-document level), so this result says
nothing about k or compressLevel individually. Machinery regression-guarded token-free in
`tests/contrast.test.js` (arms stay legal, opposition stays exactly the 8 axes, arbiter sections
stay identical); the live result itself is not a CI test.

## F8 — the "tool-free worker" was tool-free by assumption only: `claude -p` has tools and writes outside the gate

Caught by `git status` after the M3 run: stray `dur.mjs` and `sum.mjs` in the **repo root** —
written by the worker CLI itself. `claude -p` is the full Claude Code CLI: it has tools, runs in
the spawning process's cwd, and loads that cwd's CLAUDE.md as context. Three holes in one
binding: (1) worker file writes land **outside bareguard's writeScope entirely** — the gate only
sees the interpreter's write of the *returned text*; (2) from iteration 2 the gap text carries
the suite's `file://` path, so a tool-having worker could read the close's tests and
**fit-to-pass** — the exact fake-green §5b calls the only real failure; (3) the repo's CLAUDE.md
contaminates the worker's context (doctrine leakage + token waste).

**Why the shipped M3 result survives:** the close only ever reads the gated tmp artifact (strays
were never read); the seeded house conventions are not in CLAUDE.md; MAX's green was iteration 1
— before any gap text existed to leak a path; MIN, which did see gap paths, stayed red (no fake
green occurred). Verified by a sealed re-run (same categorical outcome — see F7/CHANGELOG).

**Fix (shell-owned, design decision 6 — not a config field, not an upstream gap):**
`CLIPipeProvider` already supports `cwd`; the binding now pins `cwd` to an empty per-run sandbox
dir and passes `--disallowedTools Write,Edit,NotebookEdit,Bash,WebFetch,WebSearch,Task,Glob,Grep,Read,TodoWrite`
— verified live: the CLI accepts the flag, writes nothing, and (nicely) refused an embedded
write-a-file bait outright. The worker is now tool-free in fact. Doctrine for M4+: any shell
runner that binds a CLI provider MUST seal it this way; an unsealed `claude -p` binding is a
gate bypass, not a provider choice.

## F9 — validator accepted writeScope strings the enforcement layer cannot express: green config, gate-red on every write (found by agent authorship)

M4 probe-04 round 1 (2026-07-09): first-shot authorship validity was 3/3, but the parity readout
was **agent 1/3 vs hand 3/3 — NO PARITY**. §5b diagnosis before accepting that reading: both
agent misses were `gate-red` escalations at iteration 1 (`fs.writeScope` deny on every write),
not close reds. Two distinct defects:

1. **Probe defect (information asymmetry):** the shell writes the artifact to `src/<name>.mjs`,
   but the author was given only task + catalog — it had no way to know the layout, so scopes
   like `["unique.mjs"]` deny under prefix-containment. The hand config "won" only because
   `valid.json`'s author knew the shell's layout. Fix: the catalog now states the run contract
   (artifact lands under `src/`) — contract, not coaching. Also fixed: round 1 didn't persist
   the authored configs (diagnosis had to reconstruct from the F4 mapping + `within()` truth
   table); the probe now writes `authored-<task>.json` as evidence.
2. **System gap (this finding):** the validator accepted ANY non-empty writeScope string, but
   bareguard enforcement is prefix-containment (F4) — so an authored `"src/*.mjs"` **validated
   green and then gate-redded every write at runtime**. Reds-before-tokens is the validator's
   entire job; agent authorship found a surface where it failed at it (a hand author never trips
   this — F4 covered our mapping, not the validator's blind spot). Fixed: wildcards are now
   legal only as a trailing `/**` or `/*`; anything else is a distinct
   `invalid-value:gate.writeScope` red (fixture `writescope-midglob`, 57/57).

**Why this is an M4 datum, not just a bug:** the authoring agent explores the schema surface in
ways hand authors don't — its first three configs immediately exposed a validator/enforcement
mismatch of exactly the F5 class (validates, then dies at runtime). Expect M4+ to keep doing
this; each such find tightens the reds-before-tokens contract that M6's mutation loop depends on.
Round-1 parity is superseded by the round-2 re-run (same probe, contract stated, F9 fixed) —
recorded below it in this file's spirit: the miss was real, diagnosed, and not read as
"agent can't author".

## F10 — M4 authorship: PASSED — 3/3 first-shot validity, parity-or-better on the easy cohort

Round 2 (2026-07-09, `poc/probe-04-authorship.mjs` after the F9 fix + run contract): authorship
validity **3/3 first shot**; parity **agent 3/3 green (each @ iteration 1) vs hand 2/3**
(the hand miss an honest cap-halt — three straight artifact syntax errors, the recurring worker
fumble noted in F7; no machinery red anywhere). Fit-to-pass counted: 0 possible by construction
(sealed workers, GOLD unseen close; gap text fed identically to both arms). Total round cost
~$0.53 including authoring calls (~$0.05 each).

**What the agent authored** (persisted as `authored-*.json`, world `/tmp/probe04-DPPWEx`):
coherent, task-tailored configs — budgets $0.50–$1 (tighter leashes than the hand config's $2,
which would rank WELL under green-gates/cost-ranks), maxIterations 4–6, recall k=3–4 with
compress, `stash` in after-red, `remember` correctly confined to on-green, `src/**` scopes under
the stated contract. All three chose `refine`; none chose `plan` — consistent with the F7
control's finding that shape carried no detectable signal.

**Honest bounds:** n=3 easy tasks, one round post-fix. "Parity or better" is the claim; the
hand arm's 2/3 is worker noise, not evidence the hand config is worse. The load-bearing M4
facts are: valid first-shot authorship is reliable, authored configs FUNCTION end-to-end, and
authorship exploration surfaces real system gaps (F9) — the exact behavior M5/M6 build on.
Round-1's NO PARITY and its diagnosis stand recorded in F9; it was a probe defect + validator
gap, not an authorship ceiling.

## F11 — M5 mid-run revision: PASSED — recovery 3/3 vs control 1/3, falsifier 0/2

Live (2026-07-09, `poc/probe-05-revision.mjs`): stall-prone condition = the F7 dur.mjs info-gap
task under a BLIND config (slots empty, store seeded but unused — the realistic "retention
exists, harness ignores it" state), cap 4, stall = 2 consecutive close reds, ONE revision per
run. Machinery negatives ran token-free BEFORE any live spend and all held: an arbiter-touching
revision → `arbiter-touch` revision-red with the run continuing on the OLD config; garbage →
`parse-error` revision-red, no crash, no silent accept; no stall → revisor provably never
consulted.

| arm | n | recovery |
|---|---|---|
| revision (seeded store) | 3 | **3/3 green — each at iteration 3, the first post-revision attempt** |
| no-revision control (seeded store) | 3 | 1/3 (an honest gap-fed self-recovery — consistent with F7's MIN convergence) |
| revision, EMPTY store (falsifier) | 2 | 0/2 |

**Reading:** exit met (3/3 > 1/3). Every accepted revision — 5/5 including the empty-store arms
— added a `before-attempt` recall: the agent diagnosed the correct axis from stall evidence
alone (reds steer revision — §5b's asymmetry, working). The falsifier keeps the claim honest:
identical revision behavior with no store recovered 0/2 — mid-run revision works through the
resource it surfaces, never through the act of revising. Same mechanism shape as F7's control.

**Graduated with two acceptance rules the POC surfaced:** the INTERPRETER owns acceptance
(re-validates and checks immutability itself — a revisor cannot vouch for its own output), and
`loop.maxIterations` joins gate/escalation as immutable mid-run (`cap-touch` red) because the
iteration budget is snapshotted at run start — rejecting beats silently half-applying.

**Honest bounds:** n=3/3/2 on one task family; one revision per run (multi-revision thrash is
untested, deliberately out of v1).

**Bound closed (2026-07-09, PRD v1.3 §7b.3):** the revisor is now metered by the run's OWN gate
— `proposeRevision` accepts the gate-wired `policy`/`onLlmResult` and the interpreter threads
its own through, so revisor tokens hit the same budget axis as the worker (regression: an
expensive revision halts the run at iteration 3, before the run cap of 4 — the halt is only
possible if the gate saw the revisor's spend). Authorship happens before the run's gate exists,
so the SHELL counts `authorConfig`'s returned `costUsd` into cost-to-green — an M6 accounting
requirement, now in the PRD.
