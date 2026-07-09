#!/usr/bin/env node
// Attempt-3 opaque close (F14 door b, pre-registered in F15 / PRD §7c).
// Runs the suite but reports ONLY counts — never test names or assertion text.
// §4b: the close is an information path into the worker; attempt 2 showed the
// TAP failure output teaches the hidden conventions by iteration 2–3. This
// wrapper is the declared close-verbosity condition: pass/fail counts plus a
// did-the-suite-even-load bit, nothing else. Exit code stays the verdict —
// Ralph is unchanged and unaware.
//
//   node poc/m6-opaque-close.mjs <suite.test.mjs>
import { spawnSync } from 'node:child_process';

const suite = process.argv[2];
const r = spawnSync(process.execPath, ['--test', '--test-reporter=tap', suite],
  { encoding: 'utf8', timeout: 90_000 });
const out = `${r.stdout ?? ''}\n${r.stderr ?? ''}`;
const count = (label) => Number((out.match(new RegExp(`^# ${label} (\\d+)`, 'm')) ?? [])[1] ?? NaN);
const pass = count('pass');
const fail = count('fail');

if (Number.isNaN(pass) || Number.isNaN(fail)) {
  // no TAP summary at all — the runner itself died (timeout/signal), not a test verdict
  console.log('close: suite did not run to completion (artifact failed to load, or timeout)');
  process.exit(typeof r.status === 'number' && r.status !== 0 ? r.status : 1);
}
console.log(`close: ${fail} of ${pass + fail} tests failing`);
process.exit(r.status ?? 1);
