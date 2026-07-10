// SP-3 registered task instances (F17) — the GUESSABILITY probe. Same eight
// function shapes as m6-tasks.mjs, but every house convention is IDIOSYNCRATIC:
// arbitrary tokens and inversions of natural priors that no model tier can
// reach by iterating blind against an opaque close. The notes are the ONLY
// path to these rules — that is the condition under test (F16 rewrite:
// masking = regularities within iterative reach at the cap; here they aren't).
//
// Authored UP FRONT, before any live spend; one instance per generation, same
// instance for every arm and lineage. `reference` is used ONLY by the
// launcher's --check (a close that cannot fail proves nothing) and is never
// shown to any model.

const DECOYS = [
  ['note-decoy-spine', 'The event spine is append-only JSONL: type first, seq monotonic per spine, ts stamped last as the final key; consumers are pure listeners and never read the file back.', 'fact'],
  ['note-decoy-git', 'Repo hygiene: never git add -A; stage explicit paths only, and session directories stay untracked. Only .env.example is ever committed, real env comes in at runtime.', 'fact'],
  ['note-decoy-deps', 'Dependency policy: vanilla before stdlib before external; an external dep must be maintained, lightweight and widely adopted, and security-critical code uses vetted libraries only.', 'fact'],
  ['note-decoy-poc', 'POC policy: every POC targets the riskiest assumption, must be able to fail, and is thrown away on graduation — shipping a POC is a rewrite skipped, not a shortcut earned.', 'fact'],
];
const decoy = (i) => DECOYS[i % DECOYS.length];

export const TASKS = [
  {
    id: 'dur',
    task: 'Implement the file dur.mjs. It must export a named function `parseDuration(str)` that parses a duration string (like "1h30m" or "500ms") and returns the total number of milliseconds.',
    seeds: [
      ['note-duration-format', 'Duration format house spec: valid units are h, m, s, ms and the house tick unit t, where 1t equals exactly 128 milliseconds. Unit letters must be LOWERCASE — any uppercase unit letter (as in "1H30M") is invalid and must throw a RangeError. Values are integers only.', 'episode'],
      ['note-duration-edges', 'Duration parsing edge rules: a bare numeric string with no unit (e.g. "250") is a count of house ticks, so "250" means 250 × 128 ms = 32000; empty strings and non-string input must throw a TypeError.', 'episode'],
      decoy(0),
    ],
    suite: `
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDuration } from './dur.mjs';
test('basic units', () => {
  assert.equal(parseDuration('90s'), 90_000);
  assert.equal(parseDuration('1h30m'), 5_400_000);
  assert.equal(parseDuration('500ms'), 500);
});
test('house tick unit t is 128ms', () => assert.equal(parseDuration('4t'), 512));
test('uppercase unit letters throw RangeError', () => assert.throws(() => parseDuration('1H30M'), RangeError));
test('bare numeric string means ticks', () => assert.equal(parseDuration('250'), 32_000));
test('empty or non-string input throws TypeError', () => {
  assert.throws(() => parseDuration(''), TypeError);
  assert.throws(() => parseDuration(42), TypeError);
});
`,
    reference: `
export function parseDuration(str) {
  if (typeof str !== 'string' || str === '') throw new TypeError('duration must be a non-empty string');
  const s = str.trim();
  if (/[A-Z]/.test(s)) throw new RangeError('unit letters must be lowercase');
  if (/^\\d+$/.test(s)) return Number(s) * 128;
  const UNITS = { h: 3_600_000, m: 60_000, s: 1_000, ms: 1, t: 128 };
  let total = 0, rest = s, matched = false;
  const re = /^\\s*(\\d+)(ms|h|m|s|t)/;
  while (rest.length) {
    const m = re.exec(rest);
    if (!m) throw new RangeError('unparseable duration: ' + str);
    total += Number(m[1]) * UNITS[m[2]];
    rest = rest.slice(m[0].length);
    matched = true;
  }
  if (!matched) throw new RangeError('unparseable duration: ' + str);
  return total;
}
`,
  },
  {
    id: 'bytes',
    task: 'Implement the file bytes.mjs. It must export a named function `formatBytes(n)` that formats a byte count as a human-readable string.',
    seeds: [
      ['note-bytes-units', 'Byte formatting house spec: binary units (1024 steps, labels B, KiB, MiB, GiB, TiB); the number and unit are joined by a MIDDLE DOT character "·" (U+00B7), never a space; every value carries exactly two decimal places, including plain bytes ("512.00·B", "1.50·KiB").', 'episode'],
      ['note-bytes-edges', 'Byte formatting edge rules: a count of exactly zero returns the literal word "empty" (no number, no unit); negative counts must throw a RangeError; non-number or non-finite input must throw a TypeError.', 'episode'],
      decoy(1),
    ],
    suite: `
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatBytes } from './bytes.mjs';
test('plain bytes, two decimals, middle dot', () => assert.equal(formatBytes(512), '512.00\\u00B7B'));
test('binary steps', () => {
  assert.equal(formatBytes(1536), '1.50\\u00B7KiB');
  assert.equal(formatBytes(1572864), '1.50\\u00B7MiB');
});
test('zero is the word empty', () => assert.equal(formatBytes(0), 'empty'));
test('negative throws RangeError', () => assert.throws(() => formatBytes(-1), RangeError));
test('non-number throws TypeError', () => assert.throws(() => formatBytes('1024'), TypeError));
`,
    reference: `
export function formatBytes(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) throw new TypeError('byte count must be a finite number');
  if (n < 0) throw new RangeError('byte count must be non-negative');
  if (n === 0) return 'empty';
  const UNITS = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  let i = 0, v = n;
  while (v >= 1024 && i < UNITS.length - 1) { v /= 1024; i += 1; }
  return v.toFixed(2) + '\\u00B7' + UNITS[i];
}
`,
  },
  {
    id: 'csvline',
    task: 'Implement the file csvline.mjs. It must export a named function `parseCsvLine(str)` that splits one CSV line into an array of field strings.',
    seeds: [
      ['note-csv-quoting', 'CSV house spec: the quoting character is the SINGLE quote, not the double quote; inside a quoted field a doubled single quote is a literal quote and commas do not split. Unquoted fields are trimmed AND lowercased; quoted fields keep their content exactly as written.', 'episode'],
      ['note-csv-edges', 'CSV edge rules: an empty line yields an EMPTY ARRAY ([]), not a single empty field; an unterminated quote must throw a RangeError; non-string input must throw a TypeError.', 'episode'],
      decoy(2),
    ],
    suite: `
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsvLine } from './csvline.mjs';
test('plain split lowercases unquoted fields', () => assert.deepEqual(parseCsvLine('a,B,C'), ['a', 'b', 'c']));
test('single-quoted comma does not split, content exact', () => assert.deepEqual(parseCsvLine("a,'B,c',d"), ['a', 'B,c', 'd']));
test('doubled single quote is a literal quote', () => assert.deepEqual(parseCsvLine("'say ''hi''',x"), ["say 'hi'", 'x']));
test('empty line is an empty array', () => assert.deepEqual(parseCsvLine(''), []));
test('unterminated quote throws RangeError', () => assert.throws(() => parseCsvLine("'open"), RangeError));
test('non-string throws TypeError', () => assert.throws(() => parseCsvLine(null), TypeError));
`,
    reference: `
export function parseCsvLine(str) {
  if (typeof str !== 'string') throw new TypeError('line must be a string');
  if (str === '') return [];
  const out = [];
  let field = '', quoted = false, wasQuoted = false, i = 0;
  while (i < str.length) {
    const ch = str[i];
    if (quoted) {
      if (ch === "'") {
        if (str[i + 1] === "'") { field += "'"; i += 2; continue; }
        quoted = false; i += 1; continue;
      }
      field += ch; i += 1; continue;
    }
    if (ch === "'" && field.trim() === '' && !wasQuoted) { field = ''; quoted = true; wasQuoted = true; i += 1; continue; }
    if (ch === ',') { out.push(wasQuoted ? field : field.trim().toLowerCase()); field = ''; wasQuoted = false; i += 1; continue; }
    if (!(wasQuoted && ch === ' ')) field += ch;
    i += 1;
  }
  if (quoted) throw new RangeError('unterminated quote');
  out.push(wasQuoted ? field : field.trim().toLowerCase());
  return out;
}
`,
  },
  {
    id: 'range',
    task: 'Implement the file range.mjs. It must export a named function `parseRange(str)` that parses a page-range string (like "3-7,10") and returns an array of the numbers it covers.',
    seeds: [
      ['note-range-format', 'Range house spec: comma-separated parts, each a single number or lo-hi (inclusive); a REVERSED span like "7-3" is perfectly valid and covers the same pages as "3-7". The result is deduplicated and sorted DESCENDING (largest page first), always.', 'episode'],
      ['note-range-edges', 'Range edge rules: zero and negative page numbers must throw a RangeError; empty or non-string input must throw a TypeError.', 'episode'],
      decoy(3),
    ],
    suite: `
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRange } from './range.mjs';
test('spans and singles, descending', () => assert.deepEqual(parseRange('3-5,8'), [8, 5, 4, 3]));
test('reversed span is valid', () => assert.deepEqual(parseRange('7-3'), [7, 6, 5, 4, 3]));
test('dedup + descending regardless of order', () => assert.deepEqual(parseRange('8,3-5,4'), [8, 5, 4, 3]));
test('zero page throws RangeError', () => assert.throws(() => parseRange('0-2'), RangeError));
test('empty or non-string throws TypeError', () => {
  assert.throws(() => parseRange(''), TypeError);
  assert.throws(() => parseRange(7), TypeError);
});
`,
    reference: `
export function parseRange(str) {
  if (typeof str !== 'string' || str === '') throw new TypeError('range must be a non-empty string');
  const pages = new Set();
  for (const part of str.split(',')) {
    const m = /^\\s*(\\d+)\\s*(?:-\\s*(\\d+)\\s*)?$/.exec(part);
    if (!m) throw new RangeError('unparseable part: ' + part);
    let lo = Number(m[1]);
    let hi = m[2] === undefined ? lo : Number(m[2]);
    if (hi < lo) { const t = lo; lo = hi; hi = t; }
    if (lo < 1) throw new RangeError('pages start at 1');
    for (let p = lo; p <= hi; p++) pages.add(p);
  }
  return [...pages].sort((a, b) => b - a);
}
`,
  },
  {
    id: 'ver',
    task: 'Implement the file ver.mjs. It must export a named function `compareVersions(a, b)` that compares two version strings and returns -1, 0, or 1.',
    seeds: [
      ['note-ver-format', 'Version house spec: an optional leading "v" or "V" is ignored; a pre-release suffix after a hyphen ("1.2-beta") is IGNORED entirely, never an error; house comparison considers ONLY the first two parts — major and minor — so "1.2.9" and "1.2.1" compare equal. Numeric per part, never lexicographic.', 'episode'],
      ['note-ver-edges', 'Version edge rules: comparison returns exactly -1, 0 or 1; a part that is not a plain non-negative integer (like the empty part in "1..2") must throw a TypeError, as must non-string input.', 'episode'],
      decoy(0),
    ],
    suite: `
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareVersions } from './ver.mjs';
test('numeric, not lexicographic', () => assert.equal(compareVersions('1.10', '1.9'), 1));
test('basic order', () => {
  assert.equal(compareVersions('1.2', '1.3'), -1);
  assert.equal(compareVersions('2.0', '2.0'), 0);
});
test('patch part is ignored', () => assert.equal(compareVersions('1.2.9', '1.2.1'), 0));
test('pre-release suffix is ignored', () => assert.equal(compareVersions('1.2-beta', '1.2'), 0));
test('leading v ignored', () => assert.equal(compareVersions('V1.2', '1.2'), 0));
test('malformed part throws TypeError', () => assert.throws(() => compareVersions('1..2', '1.2'), TypeError));
test('non-string throws TypeError', () => assert.throws(() => compareVersions(1.2, '1.2'), TypeError));
`,
    reference: `
export function compareVersions(a, b) {
  const parts = (v) => {
    if (typeof v !== 'string') throw new TypeError('version must be a string');
    const s = v.replace(/^[vV]/, '').replace(/-.*$/, '');
    const ps = s.split('.').map((p) => {
      if (!/^\\d+$/.test(p)) throw new TypeError('bad version part: ' + p);
      return Number(p);
    });
    return [ps[0] ?? 0, ps[1] ?? 0];
  };
  const pa = parts(a), pb = parts(b);
  for (let i = 0; i < 2; i++) {
    if (pa[i] !== pb[i]) return pa[i] < pb[i] ? -1 : 1;
  }
  return 0;
}
`,
  },
  {
    id: 'money',
    task: 'Implement the file money.mjs. It must export a named function `parseMoney(str)` that parses a money string and returns its numeric value.',
    seeds: [
      ['note-money-format', 'Money house spec: the return value is an INTEGER number of cents ("$1.50" → 150); a leading "$" is optional; the thousands separator is the APOSTROPHE, Swiss style ("1\'234.56") — commas are NOT valid in house money format and must throw a RangeError.', 'episode'],
      ['note-money-edges', 'Money edge rules: negatives are written ledger-style with a trailing " DR" suffix ("1.00 DR" → -100); a bare minus sign is not valid and must throw a RangeError; empty or non-string input must throw a TypeError.', 'episode'],
      decoy(1),
    ],
    suite: `
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMoney } from './money.mjs';
test('returns integer cents', () => assert.equal(parseMoney('$1.50'), 150));
test('apostrophe thousands separators', () => assert.equal(parseMoney("1'234.56"), 123456));
test('comma separator throws RangeError', () => assert.throws(() => parseMoney('$1,234.56'), RangeError));
test('trailing DR means negative', () => assert.equal(parseMoney('1.00 DR'), -100));
test('bare minus throws RangeError', () => assert.throws(() => parseMoney('-1.00'), RangeError));
test('empty or non-string throws TypeError', () => {
  assert.throws(() => parseMoney(''), TypeError);
  assert.throws(() => parseMoney(1.5), TypeError);
});
`,
    reference: `
export function parseMoney(str) {
  if (typeof str !== 'string' || str === '') throw new TypeError('money must be a non-empty string');
  let s = str.trim(), neg = false;
  if (s.endsWith(' DR')) { neg = true; s = s.slice(0, -3); }
  if (s.includes(',')) throw new RangeError('commas are not valid house money syntax');
  if (s.includes('-')) throw new RangeError('bare minus is not valid house money syntax');
  s = s.replace(/^\\$/, '').replace(/'/g, '');
  const m = /^(\\d+)(?:\\.(\\d{1,2}))?$/.exec(s);
  if (!m) throw new RangeError('unparseable money: ' + str);
  const cents = Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0') || 0);
  return neg ? -cents : cents;
}
`,
  },
  {
    id: 'hexcolor',
    task: 'Implement the file hexcolor.mjs. It must export a named function `parseColor(str)` that parses a hex color string and returns an object { r, g, b }.',
    seeds: [
      ['note-color-format', 'Color house spec: the leading "#" is REQUIRED — a color without it must throw a RangeError; hex digits must be lowercase, and any uppercase hex digit must throw a RangeError; the 3-digit shorthand expands by APPENDING A ZERO to each digit, so "#abc" equals "#a0b0c0" (never by doubling).', 'episode'],
      ['note-color-edges', 'Color edge rules: only lengths 3 and 6 (after the "#") are valid — anything else must throw a RangeError; a non-hex character must throw a RangeError; non-string input must throw a TypeError.', 'episode'],
      decoy(2),
    ],
    suite: `
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseColor } from './hexcolor.mjs';
test('six digits', () => assert.deepEqual(parseColor('#336699'), { r: 51, g: 102, b: 153 }));
test('missing hash throws RangeError', () => assert.throws(() => parseColor('336699'), RangeError));
test('uppercase digits throw RangeError', () => assert.throws(() => parseColor('#AABBCC'), RangeError));
test('3-digit shorthand appends zeros', () => assert.deepEqual(parseColor('#abc'), { r: 160, g: 176, b: 192 }));
test('bad length throws RangeError', () => assert.throws(() => parseColor('#abcd'), RangeError));
test('non-string throws TypeError', () => assert.throws(() => parseColor(0x336699), TypeError));
`,
    reference: `
export function parseColor(str) {
  if (typeof str !== 'string') throw new TypeError('color must be a string');
  if (!str.startsWith('#')) throw new RangeError('house colors require the leading #');
  let s = str.slice(1);
  if (/[A-F]/.test(s)) throw new RangeError('house colors are lowercase only');
  if (s.length === 3) s = [...s].map((c) => c + '0').join('');
  if (s.length !== 6) throw new RangeError('color must have 3 or 6 hex digits');
  if (!/^[0-9a-f]{6}$/.test(s)) throw new RangeError('non-hex character in color');
  return { r: parseInt(s.slice(0, 2), 16), g: parseInt(s.slice(2, 4), 16), b: parseInt(s.slice(4, 6), 16) };
}
`,
  },
  {
    id: 'initials',
    task: 'Implement the file initials.mjs. It must export a named function `initials(name)` that returns the initials of a person\'s name.',
    seeds: [
      ['note-initials-format', 'Initials house spec: EVERY name part contributes, including middle names; hyphens split parts exactly like spaces; the output is LOWERCASE letters joined by periods, so "Ada Lovelace" → "a.l" and "Anna Maria Luisa Weber" → "a.m.l.w".', 'episode'],
      ['note-initials-edges', 'Initials edge rules: a single name yields its single lowercase letter with no period ("Plato" → "p"); an empty or whitespace-only name must throw a RangeError; non-string input must throw a TypeError.', 'episode'],
      decoy(3),
    ],
    suite: `
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initials } from './initials.mjs';
test('every part contributes, lowercase, dotted', () => assert.equal(initials('Ada Lovelace'), 'a.l'));
test('middle names contribute', () => assert.equal(initials('Anna Maria Luisa Weber'), 'a.m.l.w'));
test('single name, no period', () => assert.equal(initials('Plato'), 'p'));
test('hyphens split like spaces', () => assert.equal(initials('Ada Lovelace-King'), 'a.l.k'));
test('empty name throws RangeError', () => assert.throws(() => initials('   '), RangeError));
test('non-string throws TypeError', () => assert.throws(() => initials(42), TypeError));
`,
    reference: `
export function initials(name) {
  if (typeof name !== 'string') throw new TypeError('name must be a string');
  const parts = name.trim().split(/[\\s-]+/).filter(Boolean);
  if (parts.length === 0) throw new RangeError('name must not be empty');
  return parts.map((p) => p[0].toLowerCase()).join('.');
}
`,
  },
];
