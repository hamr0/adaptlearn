// M4 machinery — token-free over a scripted stub provider (the provider is the
// shell's legitimate seam, same as tests/interpret.test.js). The LIVE result
// (3/3 first-shot validity, parity 3/3 vs 2/3 on the easy cohort — FINDINGS F10)
// is evidence, not CI; what CI protects is the authorship contract: one shot,
// never throws, invalid output is DATA, and the catalog stays faithful to the
// vocabulary the validator actually enforces.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { authorConfig, renderCatalog } from '../src/author.js';
import { LOOP_SHAPES, SLOTS, VERBS } from '../src/validate.js';
import { COMPRESS_LEVELS } from 'litectx';

const stub = (text) => ({ generate: async () => ({ text, usage: { inputTokens: 1, outputTokens: 1 }, costUsd: 0.01, toolCalls: [] }) });
const VALID = readFileSync(new URL('./fixtures/valid.json', import.meta.url), 'utf8');

test('valid JSON from the author → valid config, parsed and cost carried', async () => {
  const r = await authorConfig({ task: 'implement x.mjs', provider: stub(VALID) });
  assert.equal(r.valid, true);
  assert.deepEqual(r.reds, []);
  assert.equal(r.config.schema, 'v1');
  assert.ok(r.costUsd > 0, 'authoring cost must be carried (it counts against the budget story)');
});

test('markdown-fenced JSON still parses (workers fence; authorship must not crash on it)', async () => {
  const r = await authorConfig({ task: 't', provider: stub('```json\n' + VALID + '\n```') });
  assert.equal(r.valid, true);
});

test('non-JSON output → parse-error red as DATA, never a throw', async () => {
  const r = await authorConfig({ task: 't', provider: stub('Sure! Here is my config: it has a loop...') });
  assert.equal(r.valid, false);
  assert.equal(r.reds[0].code, 'parse-error');
  assert.equal(r.config, null);
});

test('legal JSON but invalid config → the named reds surface, config still returned', async () => {
  const broken = JSON.parse(VALID);
  delete broken.gate;
  const r = await authorConfig({ task: 't', provider: stub(JSON.stringify(broken)) });
  assert.equal(r.valid, false);
  assert.ok(r.reds.some((x) => x.code === 'missing-required' && x.path === 'gate.budgetUsd'));
  assert.ok(r.config, 'parsed config returned for diagnosis even when red');
});

test('shell cap is enforced against authored budgets, not just rendered', async () => {
  const greedy = JSON.parse(VALID);
  greedy.gate.budgetUsd = 1.5;
  const r = await authorConfig({ task: 't', provider: stub(JSON.stringify(greedy)), shellCapUsd: 1 });
  assert.equal(r.valid, false);
  assert.ok(r.reds.some((x) => x.code === 'bounds' && x.path === 'gate.budgetUsd'));
});

test('catalog stays faithful to the enforced vocabulary (drift guard)', () => {
  const c = renderCatalog();
  for (const s of LOOP_SHAPES) assert.ok(c.includes(`"${s}"`), `loop shape ${s} missing from catalog`);
  for (const s of SLOTS) assert.ok(c.includes(`"${s}"`), `slot ${s} missing from catalog`);
  for (const v of VERBS) assert.ok(c.includes(`"op": "${v}"`), `verb ${v} missing from catalog`);
  for (const l of COMPRESS_LEVELS) assert.ok(c.includes(`"${l}"`), `compress level ${l} missing from catalog`);
  assert.ok(c.includes('src/'), 'run contract (artifact under src/) missing — F9 round-1 regression');
  assert.ok(renderCatalog({ shellCapUsd: 1.25 }).includes('<= 1.25'), 'shell cap must be rendered, not hardcoded');
  assert.ok(!/never sees.*\bsrc\/interpret/.test(c));
});

test('the close is not offered anywhere in the catalog (no config field can name it)', () => {
  const c = renderCatalog();
  assert.ok(/judge, tests, provider,\nor model\) makes the config invalid/.test(c), 'catalog must warn arbiter fields are illegal');
});
