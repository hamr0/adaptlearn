// V2 contrast-bit counter — the attribution accounting rule, validated in the
// F18 addendum. Knob K = episode-recall-at-authorship. Per generation:
//   bit(K, gen) = 1  iff  ∃ run WITH K green@1  ∧  ∃ run WITHOUT K not-green@1
// i.e. a ledger-visible categorical contrast the extractor could consume.
// Retro-result: the bit was present 16/16 generations in SP-1 + SP-3 — including
// where credit was lost — so the credit-attribution gap was extractor
// VISIBILITY, never missing signal.
//
//   node poc/analyze-contrast-bits.mjs <world-dir>
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const WORLD = process.argv[2];
if (!WORLD) { console.error('usage: node poc/analyze-contrast-bits.mjs <world-dir>'); process.exit(1); }

const recallsEpisode = (cfg) => {
  const sets = [cfg?.memory?.recall?.kinds ?? []];
  for (const slot of Object.values(cfg?.hooks ?? {}))
    for (const op of slot) if (op.op === 'recall') sets.push(op.kinds ?? []);
  return sets.some((k) => Array.isArray(k) && k.includes('episode'));
};

const ledgerFile = readdirSync(WORLD).filter((f) => f.startsWith('cohort-ledger')).sort().at(-1);
const rows = readFileSync(join(WORLD, ledgerFile), 'utf8').trim().split('\n')
  .map(JSON.parse).filter((e) => e.type === 'cohort-run')
  .map((e) => {
    const cfgPath = join(WORLD, 'configs', `g${e.gen}-${e.arm}-L${e.lineage}.json`);
    const K = existsSync(cfgPath) ? recallsEpisode(JSON.parse(readFileSync(cfgPath, 'utf8'))) : null;
    return { ...e, K };
  });

const gens = [...new Set(rows.map((r) => r.gen))].sort((a, b) => a - b);
for (const g of gens) {
  const gen = rows.filter((r) => r.gen === g && r.K !== null);
  const withK = gen.filter((r) => r.K), without = gen.filter((r) => !r.K);
  const kGreen1 = withK.some((r) => r.verdict === 'green' && r.iterations === 1);
  const contrast = without.some((r) => r.verdict !== 'green' || r.iterations > 1);
  const g1 = (xs) => xs.filter((r) => r.verdict === 'green' && r.iterations === 1).length;
  console.log(`g${g}: bit=${kGreen1 && contrast ? 1 : 0}  (with-K n=${withK.length}, green@1 ${g1(withK)}; without-K n=${without.length}, green@1 ${g1(without)})`);
}
