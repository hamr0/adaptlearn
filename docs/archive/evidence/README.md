# Evidence archive — every cohort world, preserved

The FINDINGS entries cite live `/tmp/m6-cohort-*` worlds that vanish on reboot; this
directory preserves everything load-bearing from each: `cohort-ledger*.jsonl` (the record),
`cohort-result.json`, `condition.json` (declared conditions), `configs/` (config-as-authored
per cell), `configs-final/` (config-as-executed, F19/F20 era), `rules/` (extracted rules per
lineage-generation), and `spines/<cell>.jsonl` (per-run event spines — the F18 evidence).
Deliberately excluded: per-cell `.litectx` stores, `src/` artifacts, `cli-home` (bulk,
non-load-bearing).

| Directory | What it is | Findings |
|---|---|---|
| `attempt2-dQtNOb` | M6 attempt 2 — informative close (verdict saturated by close-teaching) | F14; F18 addendum (all greens blind — close taught, store untouched) |
| `attempt3-outage-halted-uTY3nt` | M6 attempt 3, first world — halted by provider outage | F15 addendum |
| `attempt3-7xErzP` | M6 attempt 3, complete — opaque close, opus worker → ARCHIVE verdict | F15, §7d; F18 re-read (5 blind vs 24 acquired greens) |
| `sp1-aSqtvl` | SP-1 — haiku worker × house conventions ($10.70) | F16; F18 re-read (1 blind vs 37 acquired) |
| `sp3-ap1exS` | SP-3 — haiku × idiosyncratic conventions ($12.93) | F17 results, F18 (the masker found in these spines) |
| `f19-K9Ofzk` | Attempt 4 — revision OFF × idiosyncratic ($8.29): **the claim expresses** | F19 (gated 1.00 vs ungated 0.13) |
| `f20-vVsQda` | Successor POC #1 — inherit=executed ($7.03): kill-switch passes | F20 (6/6 transmission) |
| `aborted-start-3OYEnQ` | 6-row aborted start (kept for completeness) | — |
| `menu-breadth-rpcu95` | bareloop de-risk probe — menu-breadth kill-switch (12 runs, clipipe). Probe layout, not cohort: `spines/<cell>.jsonl` + `artifacts/<cell>-*.mjs` (final artifact per cell); world + negatives reproducible from `poc/probe-menu-breadth.mjs` (`--negatives-only`) | F21 (WIRED-IN; attribution-poisoning mechanism); prereg `poc/menu-breadth-prereg.md` |
| `menu-disclosure-hhD2yp` | bareloop probe #2, run 1 — RUN CELLS VOID (op-composition clobber + provider crashes; postmortem in the prereg). Authoring cells load-bearing: `authored/` per-cell configs, `spines/` of the voided runs | F22 (run-1 postmortem; cargo-cult first observation) |
| `menu-disclosure-RuUllB` | bareloop probe #2, run 2 — COMPLETE (18 author + 9 run cells, 0 excluded): `authored/`, `spines/`, `artifacts/`, `console.log` | F22 (admission chain 3/3 green@1; cargo-cult replicated; lock-discrimination failed replication; leak unsupported); prereg `poc/menu-disclosure-prereg.md` |
| `truncation-declared-E1wCrp` | bareloop probe #3 — declared truncation (12 runs, clipipe, 0 excluded): `spines/<cell>.jsonl` (incl. per-iteration `meter` events), `artifacts/<cell>-artifact-<iter>.mjs` (EVERY iteration, not just final), `console.log`; world + negatives reproducible from `poc/probe-truncation-declared.mjs` (`--negatives-only`) | F23 (NULL — label not load-bearing; F21 poisoning mechanism failed replication; hunting; artifact-red revalidated); prereg `poc/truncation-declared-prereg.md` |
| *(no archive — by design)* | bareloop V-item probe V9 — instrument BIST, token-free and deterministic: replay with `node poc/bist.mjs` / `--falsify`; run-1 instrument fix + run-2 tables recorded in the prereg | F24 (GREEN — control 7/7, 7/7 faults detected, falsifier 8/8 miss; run-1 control caught a real fixture bug); prereg `poc/bist-prereg.md` |
| *(no archive — by design)* | bareloop V-item probe V10 — forbidden-zone audit, token-free and deterministic: replay with `node poc/fzone.mjs` / `--falsify` (Z-2 performs a declared real ~120s timeout wait); official tables recorded in the prereg | F25 (GAP — control 2/2, falsifier 6/6 flip; Z-3 signal-killed close coerced+retried, Z-2 timeout collapsed, Z-4 crash-at-load invisible at the seam, P4 recorded WRONG); prereg `poc/forbidden-zone-prereg.md` |
| *(no new archive — reads the worlds above)* | bareloop V-item probe V13 — toggle coverage, computed retro-only from THESE ledgers + persisted configs (`attempt2` unusable: configs never persisted). Token-free, deterministic, sub-second: replay with `node poc/toggles.mjs` / `--falsify` | F26 (metric validated — control exact, falsifier 3/3; archive insufficient — unconfounded tier barren, one re-authoring "toggle" wrong-signed, P1 WRONG; `hooks.on-green` UNWIRED everywhere); prereg `poc/toggle-coverage-prereg.md` |

Re-run the analyses against any directory here:

```
node poc/analyze-grid.mjs docs/archive/evidence/sp3-ap1exS          # F18 acquisition lens (V6 classes)
node poc/analyze-contrast-bits.mjs docs/archive/evidence/sp1-aSqtvl # V2 attribution bits
```

Console log of attempt 3's resumed final run: `../m6-cohort-2-console-7xErzP.log`.
