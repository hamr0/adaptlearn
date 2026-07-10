#!/usr/bin/env node
// SP-2 smoke (successor-product de-risk): can the sealed WORKER run on the Anthropic API
// instead of the claude CLI, with cost metering intact under the gate?
//
// The product promise is "your APIs or local LLMs"; the experiment only ever exercised
// CLIPipeProvider. One run, one task, fixed episode-wired config, opaque close — we are NOT
// measuring the claim, only exercising the provider seam. Anything missing (cost path,
// system-prompt handling, halt mapping) is a finding filed upstream, per house rules.
//
//   ANTHROPIC_API_KEY=sk-... node poc/sp2-api-smoke.mjs
//
// Throwaway per house rules. Expected cost: a few cents (haiku).

import { createRequire } from 'node:module';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { LiteCtx } from 'litectx';
import { makeSpine } from '../src/spine.js';
import { interpret } from '../src/interpret.js';
import { TASKS } from './m6-tasks.mjs';

const require = createRequire(import.meta.url);
const { AnthropicProvider } = require('bare-agent/providers');

assert.ok(process.env.ANTHROPIC_API_KEY, 'set ANTHROPIC_API_KEY (env at runtime, never in the tree)');

const SEED = JSON.parse(readFileSync(new URL('../tests/fixtures/valid.json', import.meta.url), 'utf8'));
const OPAQUE_CLOSE = new URL('./m6-opaque-close.mjs', import.meta.url).pathname;
const t = TASKS[0];

const workdir = mkdtempSync(join(tmpdir(), 'sp2-api-smoke-'));
mkdirSync(join(workdir, 'src'), { recursive: true });
const suite = join(workdir, 'src', `${t.id}.test.mjs`);
writeFileSync(suite, t.suite);
const lc = new LiteCtx({ root: workdir });
for (const [id, text, kind] of t.seeds) await lc.remember(id, text, { kind });

const provider = new AnthropicProvider({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-haiku-4-5-20251001',
});

const spineFile = join(workdir, 'spine.jsonl');
const outcome = await interpret(SEED, {
  task: t.task,
  target: join(workdir, 'src', `${t.id}.mjs`),
  close: ['node', OPAQUE_CLOSE, suite],
  workdir, capRuns: 3, emit: makeSpine(spineFile), provider, shellCapUsd: 2,
});

const events = readFileSync(spineFile, 'utf8').trimEnd().split('\n').map((l) => JSON.parse(l));
const end = events.findLast((e) => e.type === 'run-end');
const workerEvents = events.filter((e) => ['worker-result', 'worker-plan'].includes(e.type));
const costUsd = workerEvents.reduce((s, e) => s + (e.costUsd ?? 0), 0);

console.log(`\nSP-2 API smoke — world ${workdir}`);
console.log(`outcome: ${outcome} @ ${end?.iterations ?? 0} iterations`);
console.log(`worker events: ${workerEvents.length}, metered cost: $${costUsd.toFixed(4)}`);
for (const e of workerEvents) console.log(`  ${e.type} iter ${e.iteration}: costUsd=${e.costUsd ?? 'ABSENT'} tokens in/out=${e.usage?.inputTokens ?? '?'}/${e.usage?.outputTokens ?? '?'}`);
console.log('\nread: outcome green/red is NOT the point — the seam is. A $0 or ABSENT cost on a');
console.log('completed worker call is a metering gap (finding, upstream); a crash is a seam gap.');
