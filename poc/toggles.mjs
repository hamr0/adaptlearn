// V13 toggle-coverage probe (prereg: poc/toggle-coverage-prereg.md, F26 candidate).
// Token-free, offline, deterministic: per config knob, does the archived ledger hold
// >=1 observed TOGGLE — a pair of runs whose configs differ in exactly that one knob and
// whose OUTCOME CLASSES differ? Zero toggles across both tiers => unwired-until-proven.
//
// ONE counting engine (analyzeWorld) serves CONTROL, AUDIT, and every FALSIFIER sabotage;
// sabotages swap exactly one entry in `rules` and flow through the same entry point.
//   node poc/toggles.mjs            CONTROL + AUDIT (exit 0 iff control exact & 6 worlds produced)
//   node poc/toggles.mjs --falsify  FALSIFIER      (exit 0 iff 3/3 sabotages change control answer)
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AXES } from '../src/mutate.js'; // bound, never copied (F5/F9)

const HERE = fileURLToPath(new URL('.', import.meta.url));
const EVIDENCE = join(HERE, '..', 'docs', 'archive', 'evidence');
const WORLDS = ['attempt2-dQtNOb', 'attempt3-7xErzP', 'sp1-aSqtvl', 'sp3-ap1exS', 'f19-K9Ofzk', 'f20-vVsQda'];

// ---- correct rules (the locked definitions); a sabotage overrides one field ----
const RULES = { orderSensitiveKinds: false, maxKnobs: 1, toggle: (a, b) => a !== b };

// ---- primitive comparisons (kinds compare as SETS unless a sabotage says otherwise) ----
const kindsOf = (c) => c?.memory?.recall?.kinds ?? [];
const canonKinds = (arr, r) => (r.orderSensitiveKinds ? arr.slice() : [...arr].sort());
const kindsEq = (a, b, r) => JSON.stringify(canonKinds(a, r)) === JSON.stringify(canonKinds(b, r));
const canonOp = (op, r) => JSON.stringify(Object.keys(op).sort().map(
  (k) => [k, k === 'kinds' && Array.isArray(op[k]) ? canonKinds(op[k], r) : op[k]]));
const slotKey = (slot, r) => JSON.stringify((slot ?? []).map((op) => canonOp(op, r)));
const SCALARS = { 'loop.shape': (c) => c?.loop?.shape, 'loop.maxIterations': (c) => c?.loop?.maxIterations,
  'memory.recall.k': (c) => c?.memory?.recall?.k, 'memory.compressLevel': (c) => c?.memory?.compressLevel };

const axisChanged = (a, b, ax, r) => {
  if (ax.startsWith('hooks.')) { const s = ax.slice(6); return slotKey(a.hooks?.[s], r) !== slotKey(b.hooks?.[s], r); }
  if (ax === 'memory.recall.kinds') return !kindsEq(kindsOf(a), kindsOf(b), r);
  return SCALARS[ax](a) !== SCALARS[ax](b);
};

// Mirror coupling: a memory.recall.kinds set-delta mirrored into a hook recall op's `kinds`
// (same add/remove) is ONE act = single knob `memory.recall.kinds` (F15 lock's g3->g4 step).
const applyDelta = (kinds, { added, removed }) =>
  [...kinds.filter((k) => !removed.includes(k)), ...added.filter((k) => !kinds.includes(k))];
const slotMirrorExplained = (sa, sb, delta, r) => slotKey(
  (sa ?? []).map((op) => (op.op === 'recall' && Array.isArray(op.kinds) ? { ...op, kinds: applyDelta(op.kinds, delta) } : op)), r
) === slotKey(sb, r);

/** Axes that differ between two configs, after absorbing mirror-coupled hook changes. */
function diffAxes(a, b, r) {
  const changed = AXES.filter((ax) => axisChanged(a, b, ax, r));
  if (!changed.includes('memory.recall.kinds')) return changed;
  const ka = kindsOf(a), kb = kindsOf(b);
  const delta = { added: kb.filter((k) => !ka.includes(k)), removed: ka.filter((k) => !kb.includes(k)) };
  return changed.filter((ax) => !(ax.startsWith('hooks.')
    && slotMirrorExplained(a.hooks?.[ax.slice(6)], b.hooks?.[ax.slice(6)], delta, r)));
}
// knobs a pair is attributed to: 1..maxKnobs changed axes => attribute to each; else disqualified/identical.
function attributed(a, b, r) { const d = diffAxes(a, b, r); return d.length >= 1 && d.length <= r.maxKnobs ? d : []; }

const classify = (v, it) => (v !== 'green' ? 'red' : it === 1 ? 'green@1' : 'green-grind');

// ---- the single counting engine ----
function analyzeWorld(records, r = RULES) {
  const withCfg = records.filter((x) => x.cfg);
  const table = Object.fromEntries(AXES.map((ax) => [ax, { sp: 0, st: 0, lp: 0, lt: 0 }]));
  const pairs = [];
  const add = (knobs, tier, a, b, toggle) => { for (const k of knobs) {
    if (tier === 'strict') { table[k].sp++; if (toggle) table[k].st++; } else { table[k].lp++; if (toggle) table[k].lt++; }
    pairs.push({ tier, knob: k, a, b, toggle }); } };
  // T-strict: same (gen, arm), cross-lineage.
  const groups = {};
  for (const x of withCfg) (groups[`${x.gen}|${x.arm}`] ??= []).push(x);
  for (const g of Object.values(groups)) for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++)
    add(attributed(g[i].cfg, g[j].cfg, r), 'strict', g[i], g[j], r.toggle(g[i].cls, g[j].cls));
  // T-lineage: same (arm, lineage), consecutive gens (declared task confound rides along).
  const lin = {};
  for (const x of withCfg) (lin[`${x.arm}|${x.lineage}`] ??= {})[x.gen] = x;
  for (const m of Object.values(lin)) for (const gs of Object.keys(m).map(Number).sort((p, q) => p - q))
    if (m[gs + 1]) add(attributed(m[gs].cfg, m[gs + 1].cfg, r), 'lineage', m[gs], m[gs + 1], r.toggle(m[gs].cls, m[gs + 1].cls));
  return { table, pairs, unmapped: records.length - withCfg.length };
}

// ---- CONTROL: synthetic mini-world, known ground truth, same engine entry point ----
// Each fixture is its own arm (gen0, L0+L1) so exactly one T-strict pair forms per fixture,
// no cross-fixture pairing, no T-lineage pairs (no consecutive gens within an arm).
const OG = [{ op: 'remember', kind: 'episode' }]; // knob C: hooks.on-green, never varies
const cfg = ({ shape = 'refine', maxIt = 4, k = 4, kinds = ['code', 'fact'], comp = 'signature', ba }) => ({
  schema: 'v1', loop: { shape, maxIterations: maxIt },
  memory: { store: 'litectx', recall: { k, kinds }, compressLevel: comp },
  hooks: { 'before-attempt': ba ?? [{ op: 'recall', k: 4, kinds: kinds.slice() }, { op: 'compress', level: comp }],
    'after-red': [{ op: 'stash' }], 'on-green': OG } });
function buildControl() {
  const rec = (arm, lineage, cls, c) => ({ gen: 0, arm, lineage, cls, cfg: c });
  return [
    // A) true toggle on loop.maxIterations
    rec('A', 0, 'green@1', cfg({ maxIt: 2 })), rec('A', 1, 'red', cfg({ maxIt: 4 })),
    // B) single-knob memory.recall.k, SAME outcome class (pair, no toggle)
    rec('B', 0, 'green@1', cfg({ k: 1 })), rec('B', 1, 'green@1', cfg({ k: 5 })),
    // C) knob never varies -> hooks.on-green identical everywhere (unwired flag). identical configs => no pair.
    rec('C', 0, 'green@1', cfg({})), rec('C', 1, 'green@1', cfg({})),
    // D) two-knob diff (loop.shape + memory.recall.k; neither touches a hook op array),
    // differing outcomes -> must NOT count under the single-knob rule
    rec('D', 0, 'green@1', cfg({ shape: 'refine', k: 1 })),
    rec('D', 1, 'red', cfg({ shape: 'plan', k: 5 })),
    // E) order-only kinds diff -> identical (set comparison), no pair
    rec('E', 0, 'green@1', cfg({ kinds: ['code', 'fact'], ba: [{ op: 'recall', k: 4, kinds: ['code', 'fact'] }, { op: 'compress', level: 'signature' }] })),
    rec('E', 1, 'green@1', cfg({ kinds: ['fact', 'code'], ba: [{ op: 'recall', k: 4, kinds: ['code', 'fact'] }, { op: 'compress', level: 'signature' }] })),
    // F) mirrored recall.kinds coupling (recall.kinds + hook recall kinds both +episode) -> single-knob recall.kinds, toggle
    rec('F', 0, 'red', cfg({ kinds: ['code', 'fact'] })),
    rec('F', 1, 'green@1', cfg({ kinds: ['code', 'fact', 'episode'], ba: [{ op: 'recall', k: 4, kinds: ['code', 'fact', 'episode'] }, { op: 'compress', level: 'signature' }] })),
  ];
}
// Expected control table (T-strict sp/st, T-lineage lp/lt all 0). Control passes iff reproduced EXACTLY.
const EXPECTED = {
  'loop.shape': { sp: 0, st: 0, lp: 0, lt: 0 }, 'loop.maxIterations': { sp: 1, st: 1, lp: 0, lt: 0 },
  'memory.recall.k': { sp: 1, st: 0, lp: 0, lt: 0 }, 'memory.recall.kinds': { sp: 1, st: 1, lp: 0, lt: 0 },
  'memory.compressLevel': { sp: 0, st: 0, lp: 0, lt: 0 }, 'hooks.before-attempt': { sp: 0, st: 0, lp: 0, lt: 0 },
  'hooks.after-red': { sp: 0, st: 0, lp: 0, lt: 0 }, 'hooks.on-green': { sp: 0, st: 0, lp: 0, lt: 0 },
};
const tableEq = (t) => AXES.every((ax) => ['sp', 'st', 'lp', 'lt'].every((f) => t[ax][f] === EXPECTED[ax][f]));

// ---- world loader (returns records; null cfg for a row whose config file is absent) ----
function loadWorld(world) {
  const dir = join(EVIDENCE, world);
  const cdir = existsSync(join(dir, 'configs-final')) ? 'configs-final' : existsSync(join(dir, 'configs')) ? 'configs' : null;
  if (!cdir) return { skip: `no configs-final/ or configs/ dir — configs were not persisted in this world` };
  const ledgers = readdirSync(dir).filter((f) => f.startsWith('cohort-ledger')).sort();
  if (!ledgers.length) return { skip: `no cohort-ledger*.jsonl` };
  const ledger = ledgers.at(-1); // LAST when several exist
  const records = readFileSync(join(dir, ledger), 'utf8').trim().split('\n').map(JSON.parse)
    .filter((e) => e.type === 'cohort-run').map((e) => {
      const p = join(dir, cdir, `g${e.gen}-${e.arm}-L${e.lineage}.json`);
      return { gen: e.gen, arm: e.arm, lineage: e.lineage, cls: classify(e.verdict, e.iterations),
        cfg: existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null };
    });
  return { ledger, cdir, records };
}

const fmt = (t) => AXES.map((ax) => `  ${ax.padEnd(20)} T-strict pairs=${t[ax].sp} tog=${t[ax].st}   T-lin pairs=${t[ax].lp} tog=${t[ax].lt}${t[ax].st + t[ax].lt === 0 ? '   [UNWIRED]' : ''}`).join('\n');
const cls2 = (p) => `${p.a.cls}|${p.b.cls}`;

// ---- FALSIFIER: three sabotages, each attacking one locked rule, same control world ----
const SABOTAGES = [
  ['(a) co-occurrence (accepts <=2-knob pairs)', { ...RULES, maxKnobs: 2 }],
  ['(b) outcome-blind (ignores outcome class)', { ...RULES, toggle: () => true }],
  ['(c) order-sensitive kinds (arrays, not sets)', { ...RULES, orderSensitiveKinds: true }],
];
function runFalsify() {
  const control = buildControl();
  const base = analyzeWorld(control, RULES).table;
  if (!tableEq(base)) { console.log('CONTROL mismatch under correct rules — probe bug, falsifier void.'); return 1; }
  let changed = 0;
  console.log('FALSIFIER — each sabotage must CHANGE the control answer:\n');
  for (const [name, rules] of SABOTAGES) {
    const t = analyzeWorld(control, rules).table;
    const diffs = AXES.flatMap((ax) => ['sp', 'st', 'lp', 'lt'].filter((f) => t[ax][f] !== base[ax][f])
      .map((f) => `${ax}.${f}: ${base[ax][f]}->${t[ax][f]}`));
    const ok = diffs.length > 0;
    if (ok) changed++;
    console.log(`${ok ? 'CHANGED ' : 'INTACT  '} ${name}`);
    console.log(diffs.length ? `         ${diffs.join(', ')}` : '         (no change — this rule is NOT load-bearing; row void)');
  }
  console.log(`\nsabotages changing the control answer: ${changed}/3`);
  return changed === 3 ? 0 : 1;
}

// ---- default run: CONTROL + AUDIT ----
function runMain() {
  console.log('=== CONTROL (synthetic world, known ground truth, same engine) ===');
  const cres = analyzeWorld(buildControl(), RULES);
  const exact = tableEq(cres.table);
  console.log(fmt(cres.table));
  console.log(`control reproduces expected table EXACTLY: ${exact}\n`);

  console.log('=== AUDIT (six archived worlds) ===');
  const loaded = {}; let produced = 0;
  for (const w of WORLDS) {
    const L = loadWorld(w);
    if (L.skip) { console.log(`\n--- ${w} --- SKIPPED: ${L.skip}`); produced++; continue; }
    const res = analyzeWorld(L.records, RULES); loaded[w] = res;
    console.log(`\n--- ${w} --- (ledger ${L.ledger}, configs from ${L.cdir}/, ${L.records.length} runs, ${res.unmapped} without config)`);
    console.log(fmt(res.table));
    produced++;
  }

  console.log('\n=== PREDICTION READOUT (facts only) ===');
  // P1: do sp1 g0 gated-rules runs participate in ANY single-knob pair, either tier?
  const s = loaded['sp1-aSqtvl'];
  const p1 = s ? s.pairs.filter((p) => [p.a, p.b].some((x) => x.gen === 0 && x.arm === 'gated-rules')) : [];
  console.log(`\nP1 (sp1 g0 gated-rules in any single-knob pair): ${p1.length} pair(s)`);
  for (const p of p1) console.log(`   ${p.tier} knob=${p.knob}  g${p.a.gen}L${p.a.lineage}|g${p.b.gen}L${p.b.lineage}  classes=${cls2(p)}  toggle=${p.toggle}`);
  // P2: attempt3 T-lineage toggle on memory.recall.kinds, gated-rules L1 g3->g4?
  const a3 = loaded['attempt3-7xErzP'];
  const p2 = a3 ? a3.pairs.filter((p) => p.tier === 'lineage' && p.knob === 'memory.recall.kinds'
    && p.a.arm === 'gated-rules' && p.a.lineage === 1 && p.a.gen === 3 && p.b.gen === 4) : [];
  console.log(`\nP2 (attempt3 gated-rules L1 g3->g4 T-lineage toggle on memory.recall.kinds): ${p2.length} pair(s)`);
  for (const p of p2) console.log(`   classes=${cls2(p)}  toggle=${p.toggle}`);
  // P3: hooks.on-green toggle counts across all worlds
  console.log(`\nP3 (hooks.on-green pairs/toggles per world):`);
  for (const w of WORLDS) { const r = loaded[w]; if (!r) { console.log(`   ${w}: (skipped)`); continue; }
    const og = r.table['hooks.on-green'];
    console.log(`   ${w}: T-strict pairs=${og.sp} tog=${og.st}  T-lin pairs=${og.lp} tog=${og.lt}`); }

  const ok = exact && produced === WORLDS.length;
  console.log(`\ncontrol exact: ${exact}   worlds produced: ${produced}/${WORLDS.length}   => exit ${ok ? 0 : 1}`);
  return ok ? 0 : 1;
}

process.exit(process.argv.includes('--falsify') ? runFalsify() : runMain());
