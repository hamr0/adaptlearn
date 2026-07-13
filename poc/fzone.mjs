#!/usr/bin/env node
// fzone — V10 forbidden-zone audit (close-chain outcome taxonomy), a bareloop de-risk
// POC run in the adaptlearn sandbox. NOT an adaptlearn result. Pre-registration:
// poc/forbidden-zone-prereg.md (LOCKED — it governs; where this file and the prereg
// disagree, the prereg wins); doctrine: CYBERNETICS §B2/V10 (a logic family's forbidden
// zone: a value in neither the 0-band nor the 1-band is a fault, never rounded to the
// nearest — coercing such an outcome to a verdict is itself the instrument fault).
// Throwaway per PRD §doctrine — the spec (catalog + arms + build rules) ships to bareloop;
// this script never does. Candidate finding id: F25.
//
// What it is: an enumeration of every close-chain outcome that lands in NEITHER the clean
// green band (exit 0, artifact judged) NOR the clean red band (nonzero exit, artifact
// judged and failing), produced at the REAL seams (a hostile close argv is a real close;
// no replicas — F22 lesson) and read back from the real runClose return value / real spine
// JSONL written by the real makeSpine / real validateConfig result. Each outcome is scored
// by ONE pure classifier that decides from the read-back evidence alone, never from which
// row it is (that separation is the whole point — a row-aware classifier could not tell a
// coerced verdict from a clean one). Token-free: no model calls, Node stdlib + src/ only.
//
// Three arms, exit codes per prereg §"Exit codes / run":
//   default   -> CONTROL (clean bands must classify IN-BAND, no over-trigger) + AUDIT (each
//                Z-row against the real machinery, cls compared to P1..P6 at readout);
//                exit 0 iff control clean AND every Z-row produced a classification.
//   --falsify -> each row's classifier is fed a minimal SYNTHETIC opposite-class result at
//                the same read-back seam; exit 0 iff every classifier FLIPS (a classifier
//                that reports the same class on flipped input is asserting, not measuring).
//                No live spawns in this arm — it is fast (no 120s wait).
// Outcomes are reported (per-row table); no conclusion is asserted in prose — the exit code
// and the prereg's pre-worded readouts carry the verdict.

import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runClose, ralph } from '../src/ralph.js';
import { makeSpine } from '../src/spine.js';
import { validateConfig } from '../src/validate.js';

// --- temp scaffolding (mkdtemp dirs, cleaned best-effort at the end) -----------------

const tmpDirs = [];
function tmpDir(prefix) {
  const d = mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpDirs.push(d);
  return d;
}

let spineHome;
let spineN = 0;
/** A fresh JSONL path under the run's spine dir (read back by the real makeSpine writer). */
function spineFile() {
  return path.join(spineHome, `spine-${(spineN += 1)}.jsonl`);
}
function readEvents(file) {
  return readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

// --- fixtures: the argv names the test FILE, never its dir (`node --test <dir>` loads the
// dir as an entry file -> MODULE_NOT_FOUND, exit 1, redding every close — the V9 run-1 bug).

let GREEN_ARGV; // real green fixture close
let RED_ARGV; //   real red fixture close (a genuinely failing assertion)

function testFileArgv(body) {
  const dir = tmpDir('fzone-fix-');
  const file = path.join(dir, 'fixture.test.mjs');
  writeFileSync(file, body);
  return ['node', '--test', file];
}
const GREEN_BODY = "import { test } from 'node:test';\ntest('fzone-green', () => {});\n";
const RED_BODY = "import { test } from 'node:test';\nimport assert from 'node:assert';\ntest('fzone-red', () => { assert.strictEqual(1, 2); });\n";
// Z-4: a test file that throws at LOAD (top level) — zero tests execute, yet `node --test`
// still exits 1, so runClose maps it to needs_revision exactly like an honest red.
const CRASH_BODY = "// top-level throw at module load: zero tests run, exit 1 all the same\nthrow new Error('fzone Z-4 load-time crash');\n";

// --- the forbidden-zone classifier: ONE pure fn, decides from the read-back evidence ONLY.
// It never learns which row produced the evidence — so a coerced verdict and a clean verdict
// are told apart only by what the evidence itself carries (a real exit code vs none), which
// is exactly the audit's question. Evidence shapes it accepts (whatever sits at a row's seam):
//   runClose verdict object: { verdict, gap?, exitCode?, detail? }
//   ralph escalation event : { category, decisionReady, ... }  (has a `category`)
//   validateConfig result  : { ok, reds }                      (has a boolean `ok`)
//   a thrown validator      : { threw: true }                  (Z-6 coercion-by-throw form)
// Returns: IN-BAND | NAMED | COLLAPSED | COERCED.
function classify(ev) {
  if (!ev || typeof ev !== 'object') return 'COERCED'; // nothing nameable read back
  if (ev.threw) return 'COERCED'; // validator threw on garbage — coerced, not a named red
  if (typeof ev.ok === 'boolean') { // validateConfig result seam
    if (ev.ok === true) return 'COERCED'; // garbage accepted as a valid config
    return ev.reds && ev.reds.some((r) => r && r.code) ? 'NAMED' : 'COERCED';
  }
  if (typeof ev.category === 'string' && ev.category.length) return 'NAMED'; // escalation: named non-verdict
  if (typeof ev.verdict === 'string') { // runClose verdict seam
    if (ev.verdict === 'failed') { // spawn/exec never completed -> a named non-verdict (broken-close bucket)
      // COLLAPSED when a distinct outcome (a timeout — "never finished judging") is pooled
      // into that same bucket with no name of its own; otherwise NAMED (a genuine can't-run).
      return /ETIMEDOUT|timed out/i.test(String(ev.detail || '')) ? 'COLLAPSED' : 'NAMED';
    }
    if (ev.verdict === 'satisfied') return 'IN-BAND'; // clean green band
    if (ev.verdict === 'needs_revision') {
      // clean red band iff a REAL nonzero exit code was rendered; a "verdict" with no real
      // exit (signal death -> exitCode null) is a coercion, not a judgment.
      return Number.isInteger(ev.exitCode) && ev.exitCode !== 0 ? 'IN-BAND' : 'COERCED';
    }
  }
  return 'COERCED';
}

// --- AUDIT producers: each drives the real machinery and returns { observed, cls } ---------

// Z-1: nonexistent binary -> runClose 'failed' -> ralph names it 'broken-close' (NAMED seam).
async function z1() {
  const argv = ['fzone-nonexistent-binary-zzz'];
  const v = runClose(argv);
  const file = spineFile();
  const outcome = await ralph({ middle: async () => {}, close: argv, capRuns: 2, emit: makeSpine(file) });
  const esc = readEvents(file).find((e) => e.type === 'escalation');
  return {
    observed: `runClose=${v.verdict} ralph=${outcome} esc.category=${esc && esc.category} decisionReady=${esc && esc.decisionReady}`,
    cls: classify(esc),
  };
}

// Z-2: a real ~120s spawnSync timeout -> runClose 'failed' via r.error (ETIMEDOUT). runClose only.
function z2() {
  const v = runClose(['sleep', '130']);
  return { observed: `verdict=${v.verdict} detail=${disp(v.detail)}`, cls: classify(v) };
}

// Z-3: close self-kills (SIGKILL): status=null, signal set, NO spawn error -> falls through to
// needs_revision with exitCode null; ralph reads it as an ordinary red and burns cap.
async function z3() {
  const argv = ['node', '-e', 'process.kill(process.pid, "SIGKILL")'];
  const v = runClose(argv);
  const file = spineFile();
  const outcome = await ralph({ middle: async () => {}, close: argv, capRuns: 2, emit: makeSpine(file) });
  const finalEsc = readEvents(file).filter((e) => e.type === 'escalation').at(-1);
  return {
    observed: `verdict=${v.verdict} exitCode=${v.exitCode} ralph=${outcome}/${finalEsc && finalEsc.category}`,
    cls: classify(v),
  };
}

// Z-4: test file throws at load -> exit 1, zero tests executed -> needs_revision exitCode 1,
// shape-identical to an honest red at the runClose seam.
function z4() {
  const v = runClose(testFileArgv(CRASH_BODY));
  return {
    observed: `verdict=${v.verdict} exitCode=${v.exitCode} gap=${v.gap && v.gap.length ? 'nonempty' : 'empty'}`,
    cls: classify(v),
  };
}

// Z-5: middle throws a category the shell never anticipated -> ralph relays it verbatim (NAMED).
async function z5() {
  const file = spineFile();
  const outcome = await ralph({
    middle: async () => { throw { category: 'novel-category-x', message: 'unseen by the shell' }; },
    close: GREEN_ARGV, capRuns: 2, emit: makeSpine(file),
  });
  const esc = readEvents(file).find((e) => e.type === 'escalation');
  return { observed: `outcome=${outcome} esc.category=${esc && esc.category}`, cls: classify(esc) };
}

// Z-6: validator fed non-config garbage (null, 42, '{oops') -> parse-error red each time;
// classified per input, headline is NAMED iff all three are NAMED.
function z6() {
  const inputs = [['null', null], ['42', 42], ["'{oops'", '{oops']];
  const results = inputs.map(([label, inp]) => {
    let r;
    try { r = validateConfig(inp); } catch (e) { r = { threw: true, message: String(e && e.message) }; }
    return { label, r, cls: classify(r) };
  });
  const classes = results.map((x) => x.cls);
  const headline = classes.every((c) => c === 'NAMED') ? 'NAMED' : classes.join('/');
  const observed = results
    .map((x) => `${x.label}:${x.r.threw ? 'THREW' : x.r.ok ? 'ok:true' : (x.r.reds[0] && x.r.reds[0].code)}`)
    .join(' ');
  return { observed, cls: headline };
}

// --- FALSIFIER: minimal synthetic opposite-class evidence at each row's seam. realClass is
// the class the AUDIT arm actually yields (Z-4 = IN-BAND, the recorded discrepancy vs P4).
// PASS = classify(synthetic) differs from realClass — the classifier is shown to be able to
// return the other class, i.e. measuring not asserting. No spawns here, so this arm is fast.
const FALSIFIER_ROWS = [
  { id: "Z-1'", realClass: 'NAMED', note: 'coerced verdict in place of the broken-close escalation', synthetic: { verdict: 'needs_revision', exitCode: null, gap: '' } },
  { id: "Z-2'", realClass: 'COLLAPSED', note: 'a distinctly-named failed (ENOENT, no timeout marker)', synthetic: { verdict: 'failed', detail: 'Error: spawnSync fzone-x ENOENT' } },
  { id: "Z-3'", realClass: 'COERCED', note: 'a named close-killed escalation in place of the coerced verdict', synthetic: { category: 'close-killed', decisionReady: true } },
  { id: "Z-4'", realClass: 'IN-BAND', note: 'a named close-crashed escalation in place of the in-band-looking red', synthetic: { category: 'close-crashed', decisionReady: true } },
  { id: "Z-5'", realClass: 'NAMED', note: 'coerced verdict in place of the relayed novel category', synthetic: { verdict: 'needs_revision', exitCode: null, gap: '' } },
  { id: "Z-6'", realClass: 'NAMED', note: 'validator accepting the garbage (ok:true)', synthetic: { ok: true, reds: [] } },
];
function falsifier() {
  const rows = FALSIFIER_ROWS.map((f) => {
    const cls = classify(f.synthetic);
    const flipped = cls !== f.realClass;
    return { id: f.id, produced: f.note, observed: `real=${f.realClass} synthetic=${cls}`, cls, status: flipped ? 'FLIP' : 'STUCK' };
  });
  return { rows, allFlip: rows.every((r) => r.status === 'FLIP') };
}

// --- CONTROL: the clean bands must classify IN-BAND (the classifier must not over-trigger) --

function control() {
  const g = runClose(GREEN_ARGV);
  const r = runClose(RED_ARGV);
  const gCls = classify(g);
  const rCls = classify(r);
  const rows = [
    {
      id: 'CTL-green', produced: 'satisfied fixture', observed: `verdict=${g.verdict}`, cls: gCls,
      status: gCls === 'IN-BAND' && g.verdict === 'satisfied' ? 'PASS' : 'FAIL',
    },
    {
      id: 'CTL-red', produced: 'failing-assertion fixture',
      observed: `verdict=${r.verdict} exitCode=${r.exitCode} gap=${r.gap && r.gap.length ? 'nonempty' : 'empty'}`, cls: rCls,
      status: rCls === 'IN-BAND' && r.verdict === 'needs_revision' && !!(r.gap && r.gap.length) ? 'PASS' : 'FAIL',
    },
  ];
  return { rows, clean: rows.every((x) => x.status === 'PASS') };
}

async function audit() {
  const specs = [
    ['Z-1', 'close binary missing', z1],
    ['Z-2', 'close never finishes (~120s timeout)', z2],
    ['Z-3', 'close killed by signal (SIGKILL)', z3],
    ['Z-4', 'close crashes at load (0 tests, exit 1)', z4],
    ['Z-5', 'middle throws a novel category', z5],
    ['Z-6', 'validator fed non-config garbage', z6],
  ];
  const rows = [];
  for (const [id, produced, fn] of specs) {
    if (id === 'Z-2') console.log('NOTICE: Z-2 now performs the real ~120s spawnSync timeout wait (prereg §Z-2, no skip knob) — please wait ...');
    const r = await fn();
    rows.push({ id, produced, observed: r.observed, cls: r.cls });
  }
  return { rows, allClassified: rows.every((x) => typeof x.cls === 'string' && x.cls.length > 0) };
}

// --- table + main -------------------------------------------------------------------

function disp(s) {
  const str = String(s);
  return str.length > 54 ? str.slice(0, 53) + '…' : str;
}

/** Print one aligned table over the given columns. */
function printTable(cols, rows) {
  const w = cols.map((c) => Math.max(c.length, ...rows.map((r) => String(r[c] ?? '').length)));
  const fmt = (vals) => vals.map((v, i) => String(v ?? '').padEnd(w[i])).join('  ');
  console.log(fmt(cols));
  console.log(w.map((n) => '-'.repeat(n)).join('  '));
  for (const r of rows) console.log(fmt(cols.map((c) => r[c])));
}

async function main() {
  const falsify = process.argv.includes('--falsify');
  spineHome = tmpDir('fzone-spine-');
  GREEN_ARGV = testFileArgv(GREEN_BODY);
  RED_ARGV = testFileArgv(RED_BODY);

  try {
    if (falsify) {
      const f = falsifier();
      printTable(['id', 'produced', 'observed', 'cls', 'status'], f.rows);
      const flips = f.rows.filter((r) => r.status === 'FLIP').length;
      console.log(`\nFALSIFIER: ${flips}/${f.rows.length} classifiers flip on opposite-class evidence (STUCK = classifier asserts; that row's audit reading is void)`);
      return f.allFlip ? 0 : 1;
    }

    const ctl = control();
    const aud = await audit();
    console.log('\n== CONTROL (both must classify IN-BAND) ==');
    printTable(['id', 'produced', 'observed', 'cls', 'status'], ctl.rows);
    console.log('\n== AUDIT (cls read from the real machinery; compare to P1..P6 at readout) ==');
    printTable(['id', 'produced', 'observed', 'cls'], aud.rows);
    const ctlPass = ctl.rows.filter((r) => r.status === 'PASS').length;
    const classified = aud.rows.filter((r) => typeof r.cls === 'string' && r.cls.length).length;
    console.log(`\nCONTROL: ${ctlPass}/${ctl.rows.length} rows IN-BAND (FAIL = false positive; leak-search the mundane cause before any catalog change)`);
    console.log(`AUDIT:   ${classified}/${aud.rows.length} rows produced a classification (exit 0 = audit completed; the table is the readout)`);
    return ctl.clean && aud.allClassified ? 0 : 1;
  } finally {
    for (const d of tmpDirs) {
      try { rmSync(d, { recursive: true, force: true }); } catch { /* best-effort cleanup */ }
    }
  }
}

process.exit(await main());
