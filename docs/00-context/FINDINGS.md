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

## F12 — probe-06 inheritance contrast: PASSED — the rules channel steers authorship, both directions

Live (2026-07-09, `poc/probe-06-inheritance-contrast.mjs`): the M6 kill-switch (M3 doctrine one
level up — if seeded and unseeded authors are indistinguishable, the inheritance variable is not
wired in). One real green run (hand config, `unique` task) → sealed extractor distilled 5 TRUE
rules → 3 repeats × 3 authorship arms on a DIFFERENT instance (`slugify`), scored by code over 5
axes registered before spend (shape, maxIterations, recall.k, compressLevel, kinds). Machinery
negatives (scoring extremes, verbatim rules block, rule-length bounds) asserted token-free first
— and earned their keep: the first run died on a machinery assert (JSON-escaped quotes broke the
verbatim check) at $0 spent.

| arm | n valid | mean score toward own prescription | control toward same |
|---|---|---|---|
| TRUE-rules-seeded | 3/3 | **4.00 / 5** | 2.00 |
| INVERTED-rules-seeded (falsifier) | 3/3 | **5.00 / 5** | 0.00 |

**Reading:** PASS in both directions — extracted rules out-pull the control toward the config
they came from, and deliberately FALSE rules steer authors to a 5/5 opposite config the control
never touches (0.00). The channel carries CONTENT, not just tokens: the M6 gated-rules arm's
one live assumption holds, and the cohort may spend. 9/9 authored configs valid (M4's
first-shot validity holds under seeding). Spend ~$0.51 authoring+extract + one green run.

**Sharp edge to carry into the cohort read:** the falsifier steering at 5/5 means inheritance
transmits WHATEVER the extractor writes — wrong rules propagate as efficiently as right ones.
The gate (green-filtered extraction) is the only thing standing between the rules arm and
confidently inherited nonsense; that is exactly the load-bearing-gate claim M6 measures, now
with a mechanism-level reason to expect the ungated contrast to be real.

**Honest bounds:** easy task family (extractor material was an M2-class green, not a stall
recovery); steering measured on authored CONFIGS, not on downstream green-rate — the cohort
measures that; n=3 per arm.

## F13 — M6 cohort attempt 1: instrument INVALID at ceiling; provider outage crashed the launcher (two gaps fixed)

Live (2026-07-09, `poc/run-m6-cohort.mjs`, world `/tmp/m6-cohort-dQtNOb`): 62/64 rows completed,
$8.40 of the $38 stop-rule. Gens 0–6 clean; from 13:00 local every run — including the fixed
arm's known-good config — went `red:interpreter-red` at $0.00 in ~2–3s: the local `claude` CLI
stopped answering (subscription usage window). §5b class: broken middle, not harness verdicts.

**Result on the clean generations: a ceiling.** fixed 13/14, ungated 13/14, gated-verbatim
13/14, gated-rules 13/13 green; early/late 0.88→1.00 identically in every arm; 3 cap-halts in
55 readable runs. At a ~7% red-rate the gate never had anything to filter — verdict-blind
inheritance almost never inherits a red, so **ungated ≡ gated by starvation, not refutation**.
Root cause is visible at gen 0: first-shot authorship already lands in the good config region
(catalog + environment note make recall-wiring obvious; furniture-store relevance ranking does
the rest), so inheritance had nothing left to learn. The F7 stall priors came from BLIND
configs; authored configs are never blind. Per probe-05's own doctrine (control mostly greens ⇒
condition invalid, don't compare non-stressed arms): **attempt 1 is an invalid instrument, not
an archive verdict** — no claim read taken.

**Two launcher gaps the outage exposed (both a finding and a fix):**
1. The only pause was the all-red tripwire at generation BOUNDARIES; a mid-generation provider
   outage minted $0 interpreter-red rows until the boundary. §5b says broken middle → escalate
   immediately, never mint rows. Fixed: $0-interpreter-red and provider throws now prompt the
   operator (retry / record / halt) before any row is written.
2. An outage during an AUTHORING call threw uncaught and killed the process — `cohort-result.json`
   was never written; only the append-only ledger survived (the spine pattern earning its keep).
   Fixed: author failures are contained rows, configs/rules/state are persisted per run, and
   `--resume <world>` replays completed rows from the merged ledgers (hash-verified) so a killed
   same-condition run continues instead of re-spending.

**Attempt 2 difficulty redesign (pre-registered before rerun):** the learnable regularity must
live OUTSIDE what the catalog teaches. Conventions move to the litectx `episode` kind while
decoys stay `fact`; the interpreter's recall default is `['fact']`, so a config that omits kinds
— or copies the common fact-only shape — never surfaces the conventions regardless of k
(kind filters are hard; relevance ranking cannot rescue them). "Where knowledge lives" becomes
the environment fact lineages must discover and transmit. capRuns tightens 4→3 to narrow gap-fed
self-recovery. valid.json stays the fixed arm unchanged (it predates this trick — historical,
not crafted; it happens to carry both kinds, making arm A a strong floor, read as context for
C-vs-B, which alone decides the gate claim). Guard: if attempt 2 opens at an all-red generation,
the tripwire fires at gen 0 and the operator halts cheaply — worker-ceiling, not difficulty won.

**F13 addendum (2026-07-09, attempt 2 live):** a third launcher gap surfaced mid-cohort — the
revisor's sealed CLI call at g3-ungated-L1 never settled (CLI child exited, clipipe's own 180s
timeout never fired), hanging the run ~2h with no row minted. A promise that never settles
defeats the guarded try/catch entirely. Launcher-side fix: `withTimeout` races every sealed call
(5min author/extract/revisor, 30min whole-run); a hung revisor degrades to revision-red (the run
continues on its old config — never an unearned interpreter-red), gate HaltErrors still
propagate as cap-halt. **Upstream suspicion (file with F2's clipipe notes): CLIPipeProvider can
leave its promise unsettled after child exit on some path — timeout option did not fire.**
Evidence: /tmp/m6-cohort-7xErzP/g3-ungated-L1/spine.jsonl (last event stall-detected 16:10Z,
process idle ~2h, no claude child).

## F14 — M6 cohort attempt 2: NULL on the claim axis; the informative close is an unregistered teaching channel; full inheritance mechanism demonstrated in one lineage

Live (2026-07-09, `poc/run-m6-cohort.mjs`, world `/tmp/m6-cohort-7xErzP`): complete, 64 rows,
$17.93, no exclusions. One hang mid-cohort (F13 addendum) — killed, `--resume` replayed 48 rows
free, hash-verified, and finished live: the resume machinery worked in anger on first use.

**Pre-registered read (verdict axis, early gens 0–3 vs late 4–7):** flat everywhere —
fixed 0.88→0.75, ungated 0.75→0.75, gated-verbatim 0.63→0.63, gated-rules 0.75→0.75; all
arm differences within ±1 run at n=8 per cell. Gated-verbatim does NOT beat ungated; the fixed
hand config is the best single arm. On the locked claim axis: **the gate is not load-bearing on
this cohort** — the design's exit clause reads archive + boundary map.

**Mechanism (ledger × persisted configs):** the attempt-2 regularity was real and causal —
configs with `episode` in recall kinds greened **at iteration 1 in 14/25 runs (0.56)**; configs
without: **0/38 (0.00)**. Yet total green-rate was identical (0.76 vs 0.74), because the close's
failure output NAMES its tests, so by iteration 2–3 the gap text has taught the worker the very
conventions the store carried. **The informative close is a parallel teaching channel nobody
registered:** it saturates the verdict axis at cap 3 (gap-fed recovery ~0.75 — superseding the
~1/3 §7b.2 prior, which was measured on one harder instance), pushing the memory effect onto
iterations/cost (fixed mean cost-to-green $0.104 vs $0.28–0.35 in learning arms) — axes our own
doctrine (F7 2×2) bars from carrying claims. Attempt 1 saturated by authorship reaching the
catalog-expressible optimum (F13); attempt 2 saturated by the close teaching what memory was
supposed to carry. Same lesson, two channels: **every information path into the worker is part
of the instrument, and each must be registered when the claim read is designed.**

**The claimed mechanism ran end-to-end, n=1 lineage:** gated-rules L1 ground at iterations 2–3
without episode-recall (g0–g3), authored `episode` into kinds at g4 (rules + novelty nudge in
hand) → green @ 1 → the extractor codified "recall across code/doc/fact/episode" → g4–g7 all
episode-wired, ALL green @ iteration 1, at ~⅓ cost. Discover → gate → codify → transmit →
stable expression. L0 never discovered it and kept cap-halting. Inheritance visibly worked —
on the axis that cannot carry the claim.

**Disposition (explicit, pre-registered before any further spend):** two honest doors.
(a) Archive on the pre-registered read; boundary map: verdict-gated inheritance is masked
wherever the close's own output teaches the task's hidden regularities — its value expresses on
efficiency, not verdict, in informative-close environments. (b) One amended attempt 3 with an
OPAQUE close (counts only, no test names), prediction registered now: without gap teaching,
no-episode configs stay red, the verdict axis regains dynamic range, and gated-vs-ungated gets
its first uncontaminated read. ~$12–18 against ~$20 remaining. Symmetric outcome: if the gate
still fails to separate with the leak closed, archive with nothing left to blame.

## F15 — M6 attempt 3 PRE-REGISTRATION: door (b) walked, opaque-close condition declared (results pending)

Decision (hamr, 2026-07-09): exhaust attempts before the verdict — door (b) of F14, one amended
attempt 3. Registered HERE, before any spend.

**Condition (§4b declaration — the close channel):** the close argv becomes
`poc/m6-opaque-close.mjs <suite>` — it runs `node --test` internally and reports **pass/fail
counts only** ("close: N of M tests failing"), plus a suite-did-not-run line when the runner
itself dies; never test names, never assertion text. Exit code remains the verdict; Ralph,
interpreter, schema, tasks, seeds, capRuns 3, arms, and budget stop are attempt-2 verbatim.
`--check` now asserts opacity: the entire red-path gap text must match the counts line.

**Registered prediction (carried from F14, unchanged):** without gap teaching, no-episode
configs stay red; the verdict axis regains dynamic range; gated-vs-ungated gets its first
uncontaminated read. Symmetric commitment: if the gate still does not separate with the leak
closed, archive with nothing left to blame. Baseline priors are per-close-verbosity (F14);
attempt-2 rates do NOT carry over as priors here.

**Results:** PENDING — appended after the run, whatever they say.

### F15 addendum — attempt-3 run halted by provider outage; clipipe error-reporting gap (upstream)

Attempt 3 (world `/tmp/m6-cohort-uTY3nt`) ran clean through g0–g6-gated-verbatim, then died in
the `g6-gated-rules-L0` authoring call: clipipe `ProviderError: process exited with code 1:`
with EMPTY error text, retries failed identically, operator halted (correct per §5b — no rows
minted). Next morning the identical call succeeds — a **provider-side Opus outage window**
(2026-07-09 evening), independently corroborated by unrelated tooling reporting
"claude-opus-4-8 temporarily unavailable" at the same time. Not a launcher or condition defect;
`--resume` continues the same world.

**Upstream (bareagent, consume-don't-paper):** `provider-clipipe.js:180` interpolates only
`stderr` into the ProviderError message, but `claude -p --output-format json` emits its error
payload on STDOUT — so the operator saw a blank reason during a diagnosable outage. Fix belongs
upstream: include a stdout tail (or the parsed JSON error) when stderr is empty. Second clipipe
finding after the unsettled-promise suspicion (F13 addendum).

Two `red:interpreter-red @ 2` rows (g3/g6 gated-verbatim-L1, ~$0.04 each) fell inside the same
evening and are plausibly outage-adjacent (non-$0, so the F13 signature couldn't catch them);
the resume design already refuses to replay interpreter-reds, so both re-run live.

### F15 results — attempt 3 complete: mechanism separates perfectly; gate still not load-bearing on verdict; the residual masker is the worker's own prior

Complete (2026-07-10, world `/tmp/m6-cohort-uTY3nt`, $18.02, 64 rows, no exclusions; resumed
across the F15-addendum outage, 52 rows replayed hash-verified; both outage-window
interpreter-reds re-ran live and greened — outage-adjacency confirmed).

**Prediction scorecard (registered in F14/F15, judged clause by clause):**
- "verdict axis regains dynamic range" — PARTIAL YES: 12 cap-halts (attempt 2: ~0) and, on the
  first-attempt axis, perfect separation.
- "no-episode configs stay red" — **NO**: they greened 0.73 within cap 3 given nothing but a
  pass/fail count. Blind convention-guessing by the worker (Opus-class) recovers most tasks in
  ≤3 attempts with zero informative feedback.
- "gated-vs-ungated uncontaminated read" — YES, and it's null: gated-verbatim late 0.75 vs
  ungated late 0.88 (gate loses); gated-rules late 0.88 ties ungated exactly. Ungated's own
  0.63→0.88 "improvement" has no inheritance to explain it — noise/task-mix — which equally
  forbids reading gated-rules' identical trajectory as inheritance.

**Mechanism (ledger × persisted configs, recall-kinds precise):** configs recalling `episode`:
20/20 green, **green@1 = 0.80**; configs without: green@1 = **0.00 (0/44)**, total green 0.73.
The fixed arm's 1.00 is explained, not anomalous — `valid.json` has always recalled
`["fact","episode"]`; it sits on the conventions ($0.083 mean cost-to-green vs ~$0.34 learning
arms). **gated-rules L1 replicated the full inheritance loop a second time, in a second
close-verbosity condition:** blind g0–g3 → wired episode-recall at g4 → green@1 → extractor
codified → g4–g7 = green@1, green@3, green@1, green@1, tail runs at $0.040–$0.064 (~10× under
arm mean). L0 never discovered it, again.

**Reading:** the pre-registered symmetric commitment fired — the gate does not separate on the
claim axis *with the leak closed and nothing left to blame*. The masker this time is not an
unregistered channel but the **worker's prior**: an Opus-class worker guesses house-convention
regularities within a cap-3 blind search, so memory cannot decide pass/fail — only first-try
rate and cost, axes barred (F7 2×2) from carrying claims. Boundary map, final form:
**verdict-gated harness inheritance is masked wherever the environment's hidden regularities
lie within the worker's guessing reach at the given cap** — informative closes (attempt 2) and
strong workers (attempt 3) are two instances of the same masking. The regime where the claim
could express: weaker/cheaper workers, tighter caps, regularities outside prior reach.
Verdict word (archive per the registered clause) and the ladder-closing PRD v1.5 edit remain
hamr's; recorded here before any decision.

**In plain terms (the whole experiment, one paragraph):** we asked whether an agent's setup —
what it remembers, when it retries, where it looks for notes — can evolve across runs, with
only *proven* successes allowed to pass lessons forward. The machinery all worked: a dumb
un-gameable referee, setups as validated forms, AI-authored setups, mid-run revision, and
lesson inheritance that twice discovered a hidden "which drawer are the house rules in" fact
and transmitted it, making every later run first-try and ~10× cheaper. What failed was the
headline: on strict pass/fail the inheriting teams never beat the non-inheriting one, first
because our tests leaked the answers (attempts 1–2), and finally because the AI worker is
simply smart enough to guess the house rules within three blind tries (attempt 3). Learning
happened and was inherited; on tasks this size, a strong worker just doesn't *need* it to
pass — only to pass instantly and cheaply.

### F15 verdict — ARCHIVED (hamr, 2026-07-10)

The word is given: **archive**, per the pre-registered symmetric commitment. PRD v1.5 (§7d)
closes the ladder with the boundary map; version 0.10.0 is the archive release. Every run in
the denominator; no confident fake green anywhere in the record — the experiment ends the way
it was designed to be allowed to.

## F16 — Successor probe SP-1 PRE-REGISTRATION: weak worker (haiku), boundary-map test (results pending)

**This is NOT M6 attempt 4.** The ladder is closed and the archive verdict stands regardless of
this probe's outcome (PRD v1.5 §7d). SP-1 tests the §7d boundary map itself: "inheritance is
masked wherever regularities are within the worker's guessing reach" predicts the mask LIFTS
when the worker cannot guess. Decision + scope (hamr, 2026-07-10): haiku worker only, ~$5–8.

**Condition (one knob vs attempt 3):** worker model = `claude-haiku-4-5-20251001` via
`--worker-model` (new launcher flag; appends `--model` to the WORKER's sealed CLI call only).
Author, extractor, and revisor stay on the default (opus) — the two-role split is deliberate:
vary guessing ability, hold authoring competence. Everything else attempt-3 verbatim: same 8
tasks, opaque close, capRuns 3, 4 arms × 2 lineages × 8 generations, $38 stop, fresh world.
The world dir records `condition.json`; resume refuses a condition mismatch.

**Registered predictions (before any spend):**
- **P1 (instrument validity / competence floor):** the fixed arm — episode-wired by
  construction — stays ≥ 0.75 green overall. Below that, haiku cannot follow even recalled
  conventions → worker below the competence window → instrument invalid, STOP, no claim read.
- **P2 (the mask lifts):** no-episode configs collapse from opus's 0.73 gap-blind recovery to
  ≤ 0.35 total green (green@1 stays 0.00). Blind convention-guessing was the masker.
- **P3 (the unmasked read):** late-half verdict separates: gated-rules late minus ungated late
  ≥ +0.25 (≥ 2 rows at n=8/cell). This is the §7d prediction proper — memory becomes
  load-bearing on pass/fail when guessing is out of reach.
- Symmetric commitment: if P1 holds and P3 still fails, the boundary map is WRONG as stated —
  worker strength was not the (only) masker — and that gets written down as the result.

**Results:** PENDING.
