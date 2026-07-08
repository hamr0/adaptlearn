#!/usr/bin/env node
// probe-01 — M0 POC: the Ralph shell + JSONL spine, token-free.
// Riskiest assumption under test: the shell is honest under failure — a noop middle
// yields red→red→red, the cap halt is its own category (never merged with "wrong"),
// the escalation is decision-ready, and a broken close escalates immediately (no retry).
// Scenario B (passing close) exists so the probe can produce the negative: a shell
// hardwired to red would fail B.
//
// Throwaway per house rules. stdlib only. No bareagent/litectx/bareguard — the shell
// lives outside all three by design (PRD §2).

import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

// ---- spine: append-only JSONL, seq monotonic, ts stamped last (relayfact pattern) ----
function makeSpine(file) {
  let seq = 0;
  return function emit(type, data = {}) {
    const ev = { type, ...data, seq: ++seq };
    ev.ts = new Date().toISOString(); // stamped last, always the final key
    appendFileSync(file, JSON.stringify(ev) + '\n');
    return ev;
  };
}

// ---- close: exit code = truth (PRD §4 Verdict mapping) ----
function runClose(cmd, args) {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT; // §4: strip before spawning any node close
  const r = spawnSync(cmd, args, { env, encoding: 'utf8', timeout: 30_000 });
  if (r.error) return { verdict: 'failed', detail: String(r.error) };          // spawn-err → terminal
  if (r.status === 0) return { verdict: 'satisfied' };
  return { verdict: 'needs_revision', gap: (r.stderr || r.stdout || '').slice(0, 400), exitCode: r.status };
}

// ---- the Ralph shell: deliberately dumb; holds arbiter + budget; stop is executable ----
function ralph({ middle, close, capRuns, emit }) {
  emit('run-start', { capRuns, close: close.join(' ') });
  const verdicts = [];
  for (let i = 1; i <= capRuns; i++) {
    emit('iteration-start', { iteration: i });
    middle(i); // the middle never sees close, cap, or the spine's pen
    emit('middle-done', { iteration: i });
    const v = runClose(close[0], close.slice(1));
    verdicts.push(v.verdict);
    emit('close-verdict', { iteration: i, ...v });
    if (v.verdict === 'satisfied') {
      emit('run-end', { outcome: 'green', iterations: i }); // stop at first green
      return 'green';
    }
    if (v.verdict === 'failed') { // broken arbiter must not masquerade as bad harness
      emit('escalation', {
        category: 'broken-close', decisionReady: true, iteration: i, verdicts,
        spend: { runs: i, capRuns },
        decision: 'The close itself cannot run — no verdict is trustworthy until it is fixed.',
        options: ['fix the close command', 'abandon the task'],
      });
      emit('run-end', { outcome: 'escalated', iterations: i });
      return 'escalated';
    }
    // needs_revision → gap is feedback for a smarter middle; Ralph just loops
  }
  emit('cap-halt', { category: 'cap-halt', meaning: 'not under cap — not "can\'t"', capRuns });
  emit('escalation', {
    category: 'cap-halt', decisionReady: true, verdicts,
    spend: { runs: capRuns, capRuns },
    decision: `${capRuns}/${capRuns} runs spent, close still red. Continue, change approach, or stop?`,
    options: ['raise the cap and rerun', 'change the middle/harness', 'abandon the task'],
  });
  emit('run-end', { outcome: 'escalated', iterations: capRuns });
  return 'escalated';
}

// ---- probe scenarios ----
const outDir = mkdtempSync(join(tmpdir(), 'probe01-'));
const noop = () => {}; // the middle under test: does nothing, changes nothing
const scenarios = {
  A: { close: ['node', '-e', 'console.error("close red: artifact missing"); process.exit(1)'], expect: 'escalated' }, // red → cap
  B: { close: ['node', '-e', 'process.exit(0)'], expect: 'green' },      // proves shell not hardwired red
  C: { close: [join(outDir, 'no-such-close')], expect: 'escalated' },    // spawn-err → immediate escalate
};

const events = {};
for (const [name, s] of Object.entries(scenarios)) {
  const file = join(outDir, `run-${name}.jsonl`);
  const outcome = ralph({ middle: noop, close: s.close, capRuns: 3, emit: makeSpine(file) });
  assert.equal(outcome, s.expect, `scenario ${name}: outcome`);
  events[name] = readFileSync(file, 'utf8').trimEnd().split('\n').map((l) => JSON.parse(l));
}

// ---- assertions: the probe must be able to fail ----
const types = (evs) => evs.map((e) => e.type);
for (const [name, evs] of Object.entries(events)) {
  evs.forEach((e, i) => assert.equal(e.seq, i + 1, `${name}: seq monotonic`));
  evs.forEach((e) => assert.equal(Object.keys(e).at(-1), 'ts', `${name}: ts stamped last`));
}
// A: 3 honest reds, cap halt its own category, decision-ready escalation, no green anywhere
assert.deepEqual(events.A.filter((e) => e.type === 'close-verdict').map((e) => e.verdict),
  ['needs_revision', 'needs_revision', 'needs_revision'], 'A: three reds, no drift');
assert.ok(events.A.some((e) => e.type === 'cap-halt' && e.category === 'cap-halt'), 'A: cap halt own category');
const escA = events.A.find((e) => e.type === 'escalation');
assert.ok(escA.decisionReady && escA.category === 'cap-halt' && escA.options.length >= 2
  && escA.spend.runs === 3 && escA.verdicts.length === 3, 'A: escalation decision-ready');
assert.ok(!types(events.A).includes('run-end') || events.A.at(-1).outcome !== 'green', 'A: never green');
// B: green at iteration 1, stop-at-first-green, no escalation
assert.deepEqual(types(events.B),
  ['run-start', 'iteration-start', 'middle-done', 'close-verdict', 'run-end'], 'B: exactly one iteration');
assert.equal(events.B.at(-1).outcome, 'green', 'B: green');
// C: broken close escalates immediately — exactly one iteration, never retried
assert.equal(types(events.C).filter((t) => t === 'iteration-start').length, 1, 'C: no retry on broken close');
const escC = events.C.find((e) => e.type === 'escalation');
assert.ok(escC.decisionReady && escC.category === 'broken-close', 'C: broken-close decision-ready');

console.log('probe-01 PASS — all M0 exit criteria observed');
console.log(`evidence: ${outDir}`);
for (const [name, evs] of Object.entries(events)) {
  console.log(`\n[${name}] ${scenarios[name].expect}:`);
  for (const e of evs) console.log('  ' + JSON.stringify(e));
}
