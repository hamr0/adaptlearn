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

Re-run the analyses against any directory here:

```
node poc/analyze-grid.mjs docs/archive/evidence/sp3-ap1exS          # F18 acquisition lens (V6 classes)
node poc/analyze-contrast-bits.mjs docs/archive/evidence/sp1-aSqtvl # V2 attribution bits
```

Console log of attempt 3's resumed final run: `../m6-cohort-2-console-7xErzP.log`.
