#!/usr/bin/env node
// bist — V9 instrument BIST (built-in self-test), a bareloop de-risk POC run in the
// adaptlearn sandbox. NOT an adaptlearn result. Pre-registration: poc/bist-prereg.md;
// doctrine: CYBERNETICS §B4/V9 (the instrument must be able to test itself before the
// spend). Throwaway per PRD §doctrine — the spec (catalog + vectors + arms) is what
// ships to bareloop; this script never does.
//
// What it is: a stuck-at fault catalog over the three REAL instrument components
// (ralph, spine, validate) plus detection vectors that exercise the real read-back
// paths — the pre-flight that would have caught F23's contaminated instrument cell
// before tokens were spent. Faults are SYNTHETIC by definition (ATPG simulates the
// fault at a component seam — a wrapper or substitute; the wrappers are correct and
// expected). Every vector's detection power is itself proven load-bearing by
// sabotage (mutation-validation, the F4 pattern; the F22 replica-negative lesson
// mechanized): --falsify weakens each vector's assertion and confirms it then MISSES.
//
// Three arms, exit codes per prereg §"Exit codes / run":
//   default   -> CONTROL (good instrument, every vector must pass) + DETECTION (each
//                fault vs its paired vector, the vector must fail); exit 0 iff control
//                clean AND all faults detected.
//   --falsify -> each sabotaged vector vs its paired fault; exit 0 iff every one MISSES.
// Outcomes are reported (counts + per-row table); success is never asserted in prose —
// the exit code and the readouts in the prereg carry the verdict.

import { appendFileSync, mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runClose, ralph } from '../src/ralph.js';
import { makeSpine } from '../src/spine.js';
import { validateConfig } from '../src/validate.js';

// --- temp scaffolding (mkdtemp dirs, cleaned best-effort at the end) ---------------

const tmpDirs = [];
function tmpDir(prefix) {
  const d = mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpDirs.push(d);
  return d;
}

let spineHome;
let spineN = 0;
/** A fresh JSONL path under the run's spine dir. */
function spineFile() {
  return path.join(spineHome, `spine-${(spineN += 1)}.jsonl`);
}

/**
 * Write a tiny real `node --test` fixture and return the close argv for it.
 * @param {boolean} passing true -> a test that passes (green close); false -> one that fails (red close)
 * @returns {string[]} argv ['node','--test',dir]
 */
function fixtureArgv(passing) {
  const dir = tmpDir('bist-fix-');
  const body = passing
    ? "import { test } from 'node:test';\ntest('bist-green', () => {});\n"
    : "import { test } from 'node:test';\nimport assert from 'node:assert';\ntest('bist-red', () => { assert.strictEqual(1, 2); });\n";
  writeFileSync(path.join(dir, 'fixture.test.mjs'), body);
  return ['node', '--test', dir];
}

// Close-argv faults are simulated by a close that ignores its input and stuck-exits.
const STUCK_GREEN = ['node', '-e', 'process.exit(0)']; // F-C1: close stuck-at-green
const STUCK_RED = ['node', '-e', 'process.exit(1)']; //   F-C2: close stuck-at-red

let RED_ARGV; // real red fixture, shared by VEC-1/5/6
let GREEN_ARGV; // real green fixture, VEC-2

// --- faulted component variants (the stuck-at mutants, injected at the seams) -------

/** F-S1: wrap a REAL spine emit and silently drop every 2nd call. */
function faultS1(file) {
  const real = makeSpine(file);
  let n = 0;
  return (type, data) => {
    n += 1;
    if (n % 2 === 0) return undefined; // dropped: no line written, real seq not advanced
    return real(type, data);
  };
}

/** F-S2: mutant emitter that writes the line itself with seq frozen at 1. */
function faultS2(file) {
  return (type, data = {}) => {
    const ev = { type, ...data, seq: 1 };
    ev.ts = new Date().toISOString();
    appendFileSync(file, JSON.stringify(ev) + '\n');
    return ev;
  };
}

/** F-S3: mutant emitter that stamps ts as the FIRST key (ordering contract broken). */
function faultS3(file) {
  let seq = 0;
  return (type, data = {}) => {
    const ev = { ts: new Date().toISOString(), type, ...data, seq: (seq += 1) };
    appendFileSync(file, JSON.stringify(ev) + '\n');
    return ev;
  };
}

/** F-E1: wrap a REAL spine emit and truncate detail on escalation events before writing. */
function faultE1(file) {
  const real = makeSpine(file);
  return (type, data = {}) => {
    if (type === 'escalation' && typeof data.detail === 'string') {
      return real(type, { ...data, detail: data.detail.slice(0, 10) + '…' });
    }
    return real(type, data);
  };
}

/** F-V1: validator substitute that is stuck-at-green (never a red). */
const faultV1 = () => ({ ok: true, reds: [] });

// --- the VEC-4 spine-integrity check: ONE shared reader over good AND faulted spines -

/**
 * The shipping pre-flight read-back: exactly K lines, every line parses, seq strictly
 * 1..K, ts is the FINAL key of every object, type present. Same function is run against
 * the good spine (CONTROL) and each faulted spine (DETECTION) — no replica.
 * @returns {{ok: boolean, issues: string[]}}
 */
function spineIntegrity(file, K) {
  const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean);
  const issues = [];
  if (lines.length !== K) issues.push(`line count ${lines.length}!=${K}`);
  const events = [];
  lines.forEach((ln, i) => {
    try { events.push(JSON.parse(ln)); } catch { issues.push(`line ${i + 1} unparseable`); }
  });
  events.forEach((ev, i) => {
    if (ev.seq !== i + 1) issues.push(`seq ${ev.seq}!=${i + 1}`);
    if (Object.keys(ev).at(-1) !== 'ts') issues.push(`ts not final key @${i + 1}`);
    if (ev.type === undefined) issues.push(`type missing @${i + 1}`);
  });
  return { ok: issues.length === 0, issues };
}

/** Parse a spine file back to events (for VEC-3/5/6 which read specific event fields). */
function readEvents(file) {
  return readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

// --- validator fixtures (VEC-7) -----------------------------------------------------

function validConfig() {
  return {
    schema: 'v1',
    loop: { shape: 'refine' },
    memory: { store: 'litectx' },
    gate: { budgetUsd: 1, writeScope: ['tmp/**'] },
    escalation: { mode: 'decision-ready' },
  };
}
/** validConfig minus gate.writeScope, plus an illegal remember in after-red. */
function invalidConfig() {
  const c = validConfig();
  delete c.gate.writeScope;
  c.hooks = { 'after-red': [{ op: 'remember', kind: 'fact' }] };
  return c;
}

// --- detection vectors: full assertion (detects) + sabotaged (must miss) -------------
// Each vector takes the exact seam that gets faulted, so CONTROL passes the good part
// and DETECTION passes the mutant. `pass:true` = instrument looks good to the vector.

// VEC-1: known-red fixture -> needs_revision with non-empty gap (detects F-C1).
function vec1(argv) {
  const r = runClose(argv);
  return {
    observed: `verdict=${r.verdict} gap=${r.gap && r.gap.length ? 'nonempty' : 'empty'}`,
    pass: r.verdict === 'needs_revision' && !!(r.gap && r.gap.length),
  };
}
function vec1Sab(argv) { // VEC-1': accepts ANY verdict
  const r = runClose(argv);
  return { observed: `verdict=${r.verdict} (any accepted)`, pass: typeof r.verdict === 'string' };
}

// VEC-2: known-green fixture -> satisfied (detects F-C2).
function vec2(argv) {
  const r = runClose(argv);
  return { observed: `verdict=${r.verdict}`, pass: r.verdict === 'satisfied' };
}
function vec2Sab(argv) { // VEC-2': accepts ANY verdict
  const r = runClose(argv);
  return { observed: `verdict=${r.verdict} (any accepted)`, pass: typeof r.verdict === 'string' };
}

// VEC-3: broken-close mapping (nonexistent binary -> failed; ralph -> broken-close
// escalation, outcome escalated). Mapping check, no paired fault — CONTROL only.
async function vec3() {
  const argv = ['bist-nonexistent-binary-zzz'];
  const r = runClose(argv);
  const file = spineFile();
  const outcome = await ralph({ middle: async () => {}, close: argv, capRuns: 2, emit: makeSpine(file) });
  const esc = readEvents(file).find((e) => e.type === 'escalation');
  return {
    observed: `map=${r.verdict} outcome=${outcome} esc=${esc && esc.category}`,
    pass: r.verdict === 'failed' && outcome === 'escalated' && !!esc && esc.category === 'broken-close',
  };
}

// VEC-4: spine integrity over K=7 typed events (detects F-S1, F-S2, F-S3).
function vec4(spineFactory) {
  const file = spineFile();
  const emit = spineFactory(file);
  for (let i = 1; i <= 7; i += 1) emit('probe', { i });
  const res = spineIntegrity(file, 7);
  return { observed: res.ok ? 'integrity ok (7 lines, seq 1..7, ts last)' : res.issues.slice(0, 2).join('; '), pass: res.ok };
}
function vec4Sab(spineFactory) { // VEC-4': checks ONLY that lines parse
  const file = spineFile();
  const emit = spineFactory(file);
  for (let i = 1; i <= 7; i += 1) emit('probe', { i });
  const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean);
  let allParse = true;
  for (const ln of lines) { try { JSON.parse(ln); } catch { allParse = false; } }
  return { observed: `${lines.length} lines, allParse=${allParse} (parse-only)`, pass: allParse };
}

// VEC-5: escalation byte-identity. Message has spaces + a non-ASCII char, and is long
// enough that F-E1's 10-char truncation changes it (detects F-E1).
const M5 = 'gate denied: write café ✂ out-of-scope';
async function vec5(spineFactory) {
  const file = spineFile();
  await ralph({
    middle: async () => { throw { category: 'gate-red', message: M5 }; },
    close: RED_ARGV, capRuns: 2, emit: spineFactory(file),
  });
  const esc = readEvents(file).find((e) => e.type === 'escalation');
  const byteEqual = !!esc && typeof esc.detail === 'string'
    && Buffer.compare(Buffer.from(esc.detail, 'utf8'), Buffer.from(M5, 'utf8')) === 0;
  // sub-check: a category-less throw maps to interpreter-red
  const file2 = spineFile();
  await ralph({
    middle: async () => { throw new Error('boom'); },
    close: RED_ARGV, capRuns: 2, emit: spineFactory(file2),
  });
  const esc2 = readEvents(file2).find((e) => e.type === 'escalation');
  const catless = !!esc2 && esc2.category === 'interpreter-red';
  return {
    observed: `cat=${esc && esc.category} decisionReady=${esc && esc.decisionReady} byteEqual=${byteEqual} catless=${catless}`,
    pass: !!esc && esc.category === 'gate-red' && esc.decisionReady === true && byteEqual && catless,
  };
}
async function vec5Sab(spineFactory) { // VEC-5': checks event EXISTENCE only, not bytes
  const file = spineFile();
  await ralph({
    middle: async () => { throw { category: 'gate-red', message: M5 }; },
    close: RED_ARGV, capRuns: 2, emit: spineFactory(file),
  });
  const esc = readEvents(file).find((e) => e.type === 'escalation');
  return { observed: `escalation present=${!!esc} (existence-only)`, pass: !!esc };
}

// VEC-6: cap-halt honesty (middle never fixes + red close + capRuns=2 -> escalated,
// cap-halt event, zero satisfied verdicts). Green-on-broken (F-C1) trips this too.
async function vec6(argv) {
  const file = spineFile();
  const outcome = await ralph({ middle: async () => {}, close: argv, capRuns: 2, emit: makeSpine(file) });
  const events = readEvents(file);
  const capHalt = events.some((e) => e.type === 'cap-halt');
  const satisfied = events.filter((e) => e.type === 'close-verdict' && e.verdict === 'satisfied').length;
  return {
    observed: `outcome=${outcome} capHalt=${capHalt} satisfied=${satisfied}`,
    pass: outcome === 'escalated' && capHalt && satisfied === 0,
  };
}
async function vec6Sab(argv) { // VEC-6': checks only that an outcome string exists
  const file = spineFile();
  const outcome = await ralph({ middle: async () => {}, close: argv, capRuns: 2, emit: makeSpine(file) });
  return { observed: `outcome=${outcome} (outcome-exists-only)`, pass: typeof outcome === 'string' };
}

// VEC-7: validator named reds by code AND path on the invalid config; ok on the valid
// config (detects F-V1).
function vec7(validateFn) {
  const inv = validateFn(invalidConfig(), { shellCapUsd: 2 });
  const val = validateFn(validConfig(), { shellCapUsd: 2 });
  const missing = !!(inv.reds && inv.reds.some((r) => r.code === 'missing-required' && r.path === 'gate.writeScope'));
  const placement = !!(inv.reds && inv.reds.some((r) => r.code === 'verb-placement'));
  return {
    observed: `inv.ok=${inv.ok} missing@writeScope=${missing} verb-placement=${placement} val.ok=${val.ok}`,
    pass: inv.ok === false && missing && placement && val.ok === true,
  };
}
function vec7Sab(validateFn) { // VEC-7': checks only that ok is boolean
  const inv = validateFn(invalidConfig(), { shellCapUsd: 2 });
  return { observed: `typeof ok=${typeof inv.ok} (ok-is-boolean-only)`, pass: typeof inv.ok === 'boolean' };
}

// --- harness: run a row, format a table --------------------------------------------

/** Run a vector thunk, turning a crash into a non-passing observation (never rethrow). */
async function safe(thunk) {
  try {
    const r = await thunk();
    return { observed: r.observed, pass: r.pass, threw: false };
  } catch (e) {
    return { observed: `threw: ${(e && e.message) || e}`, pass: false, threw: true };
  }
}

function disp(s) {
  const str = String(s);
  return str.length > 54 ? str.slice(0, 53) + '…' : str;
}

/** Print one aligned table for an arm's rows. */
function printTable(rows) {
  const cols = ['arm', 'id', 'expectation', 'observed', 'status'];
  const w = cols.map((c) => Math.max(c.length, ...rows.map((r) => String(r[c]).length)));
  const fmt = (vals) => vals.map((v, i) => String(v).padEnd(w[i])).join('  ');
  console.log(fmt(cols));
  console.log(w.map((n) => '-'.repeat(n)).join('  '));
  for (const r of rows) console.log(fmt(cols.map((c) => r[c])));
}

// --- arms ---------------------------------------------------------------------------

/** CONTROL: every vector against the GOOD instrument; each must pass (no false positive). */
async function control() {
  const specs = [
    ['VEC-1', () => vec1(RED_ARGV)],
    ['VEC-2', () => vec2(GREEN_ARGV)],
    ['VEC-3', () => vec3()],
    ['VEC-4', () => vec4(makeSpine)],
    ['VEC-5', () => vec5(makeSpine)],
    ['VEC-6', () => vec6(RED_ARGV)],
    ['VEC-7', () => vec7(validateConfig)],
  ];
  const rows = [];
  let clean = true;
  for (const [id, thunk] of specs) {
    const r = await safe(thunk);
    if (!r.pass) clean = false;
    rows.push({ arm: 'CONTROL', id, expectation: 'pass', observed: disp(r.observed), status: r.pass ? 'PASS' : 'FAIL' });
  }
  return { rows, clean };
}

/** DETECTION: each fault against its paired vector(s); the vector must FAIL (= detect). */
async function detection() {
  const specs = [
    ['F-C1×VEC-1', 'F-C1', () => vec1(STUCK_GREEN)],
    ['F-C1×VEC-6', 'F-C1', () => vec6(STUCK_GREEN)],
    ['F-C2×VEC-2', 'F-C2', () => vec2(STUCK_RED)],
    ['F-S1×VEC-4', 'F-S1', () => vec4(faultS1)],
    ['F-S2×VEC-4', 'F-S2', () => vec4(faultS2)],
    ['F-S3×VEC-4', 'F-S3', () => vec4(faultS3)],
    ['F-E1×VEC-5', 'F-E1', () => vec5(faultE1)],
    ['F-V1×VEC-7', 'F-V1', () => vec7(faultV1)],
  ];
  const rows = [];
  const detectedFaults = new Set();
  let allDetected = true;
  for (const [id, fault, thunk] of specs) {
    const r = await safe(thunk);
    const detected = !r.pass; // fault is detected when the full vector fails to pass
    if (detected) detectedFaults.add(fault); else allDetected = false;
    rows.push({ arm: 'DETECTION', id, expectation: 'detect (vector fails)', observed: disp(r.observed), status: detected ? 'DETECTED' : 'MISSED' });
  }
  return { rows, allDetected, faultCount: detectedFaults.size };
}

/** FALSIFIER: each sabotaged vector against its paired fault; each must MISS (not detect). */
async function falsifier() {
  const specs = [
    ["VEC-1'×F-C1", () => vec1Sab(STUCK_GREEN)],
    ["VEC-2'×F-C2", () => vec2Sab(STUCK_RED)],
    ["VEC-4'×F-S1", () => vec4Sab(faultS1)],
    ["VEC-4'×F-S2", () => vec4Sab(faultS2)],
    ["VEC-4'×F-S3", () => vec4Sab(faultS3)],
    ["VEC-5'×F-E1", () => vec5Sab(faultE1)],
    ["VEC-6'×F-C1", () => vec6Sab(STUCK_GREEN)],
    ["VEC-7'×F-V1", () => vec7Sab(faultV1)],
  ];
  const rows = [];
  let allMiss = true;
  for (const [id, thunk] of specs) {
    const r = await safe(thunk);
    const miss = r.pass === true && !r.threw; // a crash is incidental detection, not a miss
    if (!miss) allMiss = false;
    rows.push({ arm: 'FALSIFIER', id, expectation: 'miss', observed: disp(r.observed), status: miss ? 'MISS' : 'STILL-DETECTED' });
  }
  return { rows, allMiss };
}

// --- main ---------------------------------------------------------------------------

async function main() {
  const falsify = process.argv.includes('--falsify');
  spineHome = tmpDir('bist-spine-');
  RED_ARGV = fixtureArgv(false);
  GREEN_ARGV = fixtureArgv(true);

  try {
    if (falsify) {
      const f = await falsifier();
      printTable(f.rows);
      const miss = f.rows.filter((r) => r.status === 'MISS').length;
      console.log(`\nFALSIFIER: ${miss}/${f.rows.length} sabotaged vectors miss; STILL-DETECTED rows = detection was incidental (vector not load-bearing)`);
      return f.allMiss ? 0 : 1;
    }

    const ctl = await control();
    const det = await detection();
    printTable([...ctl.rows, ...det.rows]);
    const ctlPass = ctl.rows.filter((r) => r.status === 'PASS').length;
    const detHit = det.rows.filter((r) => r.status === 'DETECTED').length;
    console.log(`\nCONTROL:   ${ctlPass}/${ctl.rows.length} vectors pass (FAIL rows = false positives)`);
    console.log(`DETECTION: ${detHit}/${det.rows.length} rows detect; ${det.faultCount}/7 distinct faults detected`);
    return ctl.clean && det.allDetected ? 0 : 1;
  } finally {
    for (const d of tmpDirs) {
      try { rmSync(d, { recursive: true, force: true }); } catch { /* best-effort cleanup */ }
    }
  }
}

process.exit(await main());
