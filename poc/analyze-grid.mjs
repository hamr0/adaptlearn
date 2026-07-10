// The F18 acquisition lens — classifies every cohort green by MECHANISM from
// spine evidence (V6), not by starting config. This is the analysis that found
// the masker: config-as-authored reads are blind to M5 revision.
//
//   node poc/analyze-grid.mjs <world-dir>
//
// <world-dir> is a live /tmp world or an archived copy under
// docs/archive/evidence/ (spines under spines/<cell>.jsonl or <cell>/spine.jsonl).
//
// Classes per green: feedforward (episode-wired at authorship ∧ green@1),
// feedback-acquired (revision-accepted ∧ recall hits jumped by the green
// iteration), episode-slow (episode-wired, @>1), blind-green (none of the above
// — genuine prior reach; the rare case everywhere except attempt 2, where the
// informative close taught instead: F14).
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const WORLD = process.argv[2];
if (!WORLD) { console.error('usage: node poc/analyze-grid.mjs <world-dir>'); process.exit(1); }

const ledgerFile = readdirSync(WORLD).filter((f) => f.startsWith('cohort-ledger')).sort().at(-1);
const ledger = readFileSync(join(WORLD, ledgerFile), 'utf8')
  .trim().split('\n').map(JSON.parse).filter((e) => e.type === 'cohort-run');

const recallsEpisode = (cfg) => {
  const kindSets = [cfg?.memory?.recall?.kinds ?? []];
  for (const slot of Object.values(cfg?.hooks ?? {}))
    for (const op of slot) if (op.op === 'recall') kindSets.push(op.kinds ?? []);
  return kindSets.some((ks) => Array.isArray(ks) && ks.includes('episode'));
};

const spinePath = (cell) => {
  const flat = join(WORLD, 'spines', `${cell}.jsonl`);
  if (existsSync(flat)) return flat;
  const dirs = readdirSync(WORLD).filter((d) => d === cell || d.startsWith(`${cell}-r`)).sort();
  const nested = dirs.at(-1) && join(WORLD, dirs.at(-1), 'spine.jsonl');
  return nested && existsSync(nested) ? nested : null;
};

const rows = [];
for (const e of ledger) {
  const cell = `g${e.gen}-${e.arm}-L${e.lineage}`;
  const cfgPath = join(WORLD, 'configs', `${cell}.json`);
  const startEpisode = existsSync(cfgPath) ? recallsEpisode(JSON.parse(readFileSync(cfgPath, 'utf8'))) : null;
  let revised = false;
  const hitsByIter = {};
  const sp = spinePath(cell);
  if (sp) {
    for (const ev of readFileSync(sp, 'utf8').trim().split('\n').map(JSON.parse)) {
      if (ev.type === 'revision-accepted') revised = true;
      if (ev.type === 'hook-op' && ev.op === 'recall') hitsByIter[ev.iteration] = (hitsByIter[ev.iteration] ?? 0) + (ev.hits ?? 0);
    }
  }
  const hitsAtEnd = hitsByIter[e.iterations] ?? 0;
  const hitsAt1 = hitsByIter[1] ?? 0;
  const cls = e.verdict !== 'green' ? '-'
    : startEpisode && e.iterations === 1 ? 'feedforward'
    : revised && hitsAtEnd > hitsAt1 ? 'feedback-acquired'
    : startEpisode ? 'episode-slow'
    : 'blind-green';
  rows.push({ cell, arm: e.arm, verdict: e.verdict, iters: e.iterations, startEpisode, revised, hitsByIter, cls });
}

for (const r of rows) console.log(
  r.cell.padEnd(24), r.verdict.padEnd(9), `@${r.iters}`,
  'epi0=' + String(r.startEpisode).padEnd(5), 'rev=' + String(r.revised).padEnd(5),
  ('hits ' + Object.entries(r.hitsByIter).map(([i, h]) => `${i}:${h}`).join(' ')).padEnd(16), r.cls);

console.log('\n== class counts per arm ==');
const tally = {};
for (const r of rows) { tally[r.arm] ??= {}; tally[r.arm][r.cls] = (tally[r.arm][r.cls] ?? 0) + 1; }
console.log(JSON.stringify(tally, null, 1));
console.log('\n== episode-wired-at-authorship per arm ==');
const se = {};
for (const r of rows) { se[r.arm] ??= [0, 0]; se[r.arm][1]++; if (r.startEpisode) se[r.arm][0]++; }
for (const [a, [y, n]] of Object.entries(se)) console.log(a.padEnd(16), `${y}/${n}`);
