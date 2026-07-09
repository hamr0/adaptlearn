// M6 registered task instances — authored UP FRONT, before generation 1 (design
// docs/plans/2026-07-09-m6-inheritance-selection-design.md; no mid-cohort task
// authoring). One instance per generation, same instance for every arm and
// lineage within a generation.
//
// Family = the F7/M5 info-gap shape: the task statement understates 2+ house
// conventions; the GOLD close tests them; the store is seeded (task furniture,
// identical for all arms) with prose notes carrying exactly those conventions
// plus one decoy — a harness that surfaces the notes can green early, a blind
// one is left to gap-fed self-recovery (~1/3 baseline, §7b.2).
//
// `reference` is used ONLY by run-m6-cohort.mjs --check (close sanity: the
// reference must green its own suite before any live spend). It is never shown
// to any model.

const DECOYS = [
  ['note-decoy-spine', 'The event spine is append-only JSONL: type first, seq monotonic per spine, ts stamped last as the final key; consumers are pure listeners and never read the file back.'],
  ['note-decoy-git', 'Repo hygiene: never git add -A; stage explicit paths only, and session directories stay untracked. Only .env.example is ever committed, real env comes in at runtime.'],
  ['note-decoy-deps', 'Dependency policy: vanilla before stdlib before external; an external dep must be maintained, lightweight and widely adopted, and security-critical code uses vetted libraries only.'],
  ['note-decoy-poc', 'POC policy: every POC targets the riskiest assumption, must be able to fail, and is thrown away on graduation — shipping a POC is a rewrite skipped, not a shortcut earned.'],
];
const decoy = (i) => DECOYS[i % DECOYS.length];

export const TASKS = [
  {
    id: 'dur', // the F7/M5 anchor instance — known stall-prone at cap 4
    task: 'Implement the file dur.mjs. It must export a named function `parseDuration(str)` that parses a duration string (like "1h30m" or "500ms") and returns the total number of milliseconds.',
    seeds: [
      ['note-duration-format', 'Duration format house spec: valid units are h, m, s, and ms; components may be separated by single spaces (e.g. "2h 15m"); unit letters are case-insensitive, so "1H30M" equals "1h30m". Fractional values like "1.5h" are allowed.'],
      ['note-duration-edges', 'Duration parsing edge rules: a bare numeric string with no unit (e.g. "250") means milliseconds; negative durations are invalid and must throw a RangeError; empty strings and non-string input must throw a TypeError.'],
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
test('fractions allowed', () => assert.equal(parseDuration('1.5h'), 5_400_000));
test('single spaces between components allowed', () => assert.equal(parseDuration('2h 15m'), 8_100_000));
test('unit letters are case-insensitive', () => assert.equal(parseDuration('1H30M'), 5_400_000));
test('bare numeric string means milliseconds', () => assert.equal(parseDuration('250'), 250));
test('negative durations throw RangeError', () => assert.throws(() => parseDuration('-5m'), RangeError));
test('empty or non-string input throws TypeError', () => {
  assert.throws(() => parseDuration(''), TypeError);
  assert.throws(() => parseDuration(42), TypeError);
});
`,
    reference: `
export function parseDuration(str) {
  if (typeof str !== 'string' || str === '') throw new TypeError('duration must be a non-empty string');
  const s = str.trim();
  if (/^\\d+(\\.\\d+)?$/.test(s)) return Number(s);
  if (s.startsWith('-')) throw new RangeError('negative duration');
  const UNITS = { h: 3_600_000, m: 60_000, s: 1_000, ms: 1 };
  let total = 0, rest = s, matched = false;
  const re = /^\\s*(\\d+(?:\\.\\d+)?)(ms|h|m|s)/i;
  while (rest.length) {
    const m = re.exec(rest);
    if (!m) throw new RangeError('unparseable duration: ' + str);
    total += Number(m[1]) * UNITS[m[2].toLowerCase()];
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
    task: 'Implement the file bytes.mjs. It must export a named function `formatBytes(n)` that formats a byte count as a human-readable string (like "1.5 MiB").',
    seeds: [
      ['note-bytes-units', 'Byte formatting house spec: binary units only — 1024 steps with labels B, KiB, MiB, GiB, TiB. One decimal place for scaled values ("1.5 MiB"), but plain bytes are integers with no decimal ("512 B"). Exactly one space between number and unit.'],
      ['note-bytes-edges', 'Byte formatting edge rules: zero formats as "0 B"; negative counts are invalid and must throw a RangeError; non-number or non-finite input must throw a TypeError.'],
      decoy(1),
    ],
    suite: `
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatBytes } from './bytes.mjs';
test('plain bytes, integer, no decimal', () => assert.equal(formatBytes(512), '512 B'));
test('binary steps with one decimal', () => {
  assert.equal(formatBytes(1536), '1.5 KiB');
  assert.equal(formatBytes(1572864), '1.5 MiB');
});
test('gigabytes', () => assert.equal(formatBytes(2147483648), '2.0 GiB'));
test('zero is "0 B"', () => assert.equal(formatBytes(0), '0 B'));
test('negative throws RangeError', () => assert.throws(() => formatBytes(-1), RangeError));
test('non-number throws TypeError', () => assert.throws(() => formatBytes('1024'), TypeError));
`,
    reference: `
export function formatBytes(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) throw new TypeError('byte count must be a finite number');
  if (n < 0) throw new RangeError('byte count must be non-negative');
  const UNITS = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  let i = 0, v = n;
  while (v >= 1024 && i < UNITS.length - 1) { v /= 1024; i += 1; }
  return i === 0 ? String(Math.trunc(v)) + ' B' : v.toFixed(1) + ' ' + UNITS[i];
}
`,
  },
  {
    id: 'csvline',
    task: 'Implement the file csvline.mjs. It must export a named function `parseCsvLine(str)` that splits one CSV line into an array of field strings.',
    seeds: [
      ['note-csv-quoting', 'CSV house spec: fields may be double-quoted; inside a quoted field a doubled quote "" is a literal quote and commas do not split. Whitespace around UNQUOTED fields is trimmed; quoted fields keep their content exactly.'],
      ['note-csv-edges', 'CSV edge rules: an empty line yields a single empty field ([""]) not an empty array; an unterminated quote must throw a RangeError; non-string input must throw a TypeError.'],
      decoy(2),
    ],
    suite: `
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsvLine } from './csvline.mjs';
test('plain split', () => assert.deepEqual(parseCsvLine('a,b,c'), ['a', 'b', 'c']));
test('quoted comma does not split', () => assert.deepEqual(parseCsvLine('a,"b,c",d'), ['a', 'b,c', 'd']));
test('doubled quote is a literal quote', () => assert.deepEqual(parseCsvLine('"say ""hi""",x'), ['say "hi"', 'x']));
test('unquoted fields are trimmed, quoted are exact', () => assert.deepEqual(parseCsvLine('  a , " b "'), ['a', ' b ']));
test('empty line is one empty field', () => assert.deepEqual(parseCsvLine(''), ['']));
test('unterminated quote throws RangeError', () => assert.throws(() => parseCsvLine('"open'), RangeError));
test('non-string throws TypeError', () => assert.throws(() => parseCsvLine(null), TypeError));
`,
    reference: `
export function parseCsvLine(str) {
  if (typeof str !== 'string') throw new TypeError('line must be a string');
  const out = [];
  let field = '', quoted = false, wasQuoted = false, i = 0;
  while (i < str.length) {
    const ch = str[i];
    if (quoted) {
      if (ch === '"') {
        if (str[i + 1] === '"') { field += '"'; i += 2; continue; }
        quoted = false; i += 1; continue;
      }
      field += ch; i += 1; continue;
    }
    if (ch === '"' && field.trim() === '' && !wasQuoted) { field = ''; quoted = true; wasQuoted = true; i += 1; continue; }
    if (ch === ',') { out.push(wasQuoted ? field : field.trim()); field = ''; wasQuoted = false; i += 1; continue; }
    if (!(wasQuoted && ch === ' ')) field += ch; // whitespace after a closing quote is ignored
    i += 1;
  }
  if (quoted) throw new RangeError('unterminated quote');
  out.push(wasQuoted ? field : field.trim());
  return out;
}
`,
  },
  {
    id: 'range',
    task: 'Implement the file range.mjs. It must export a named function `parseRange(str)` that parses a page-range string (like "3-7,10") and returns an array of the numbers it covers.',
    seeds: [
      ['note-range-format', 'Range house spec: comma-separated parts, each a single number or lo-hi (inclusive both ends); single spaces around commas and hyphens are allowed. The result is deduplicated and sorted ascending regardless of input order.'],
      ['note-range-edges', 'Range edge rules: a reversed range like "7-3" must throw a RangeError; zero and negative page numbers must throw a RangeError; empty or non-string input must throw a TypeError.'],
      decoy(3),
    ],
    suite: `
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRange } from './range.mjs';
test('spans and singles', () => assert.deepEqual(parseRange('3-5,8'), [3, 4, 5, 8]));
test('spaces allowed', () => assert.deepEqual(parseRange('1 - 3, 6'), [1, 2, 3, 6]));
test('dedup + ascending regardless of order', () => assert.deepEqual(parseRange('8,3-5,4'), [3, 4, 5, 8]));
test('reversed range throws RangeError', () => assert.throws(() => parseRange('7-3'), RangeError));
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
    const lo = Number(m[1]);
    const hi = m[2] === undefined ? lo : Number(m[2]);
    if (lo < 1 || hi < 1) throw new RangeError('pages start at 1');
    if (hi < lo) throw new RangeError('reversed range: ' + part);
    for (let p = lo; p <= hi; p++) pages.add(p);
  }
  return [...pages].sort((a, b) => a - b);
}
`,
  },
  {
    id: 'ver',
    task: 'Implement the file ver.mjs. It must export a named function `compareVersions(a, b)` that compares two version strings and returns -1, 0, or 1.',
    seeds: [
      ['note-ver-format', 'Version house spec: an optional leading "v" or "V" is ignored ("v1.2" equals "1.2"); missing parts count as zero, so "1.2" equals "1.2.0"; comparison is numeric per dot-separated part, never lexicographic ("1.10" > "1.9").'],
      ['note-ver-edges', 'Version edge rules: comparison returns exactly -1, 0 or 1; a part that is not a plain non-negative integer (e.g. "1.2-beta", "1..2") must throw a TypeError, as must non-string input.'],
      decoy(0),
    ],
    suite: `
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareVersions } from './ver.mjs';
test('numeric, not lexicographic', () => assert.equal(compareVersions('1.10', '1.9'), 1));
test('basic order', () => {
  assert.equal(compareVersions('1.2.3', '1.2.4'), -1);
  assert.equal(compareVersions('2.0.0', '2.0.0'), 0);
});
test('leading v ignored, case-insensitive', () => assert.equal(compareVersions('V1.2', '1.2'), 0));
test('missing parts are zero', () => assert.equal(compareVersions('1.2', '1.2.0'), 0));
test('non-integer part throws TypeError', () => {
  assert.throws(() => compareVersions('1.2-beta', '1.2'), TypeError);
  assert.throws(() => compareVersions('1..2', '1.2'), TypeError);
});
test('non-string throws TypeError', () => assert.throws(() => compareVersions(1.2, '1.2'), TypeError));
`,
    reference: `
export function compareVersions(a, b) {
  const parts = (v) => {
    if (typeof v !== 'string') throw new TypeError('version must be a string');
    const s = v.replace(/^[vV]/, '');
    return s.split('.').map((p) => {
      if (!/^\\d+$/.test(p)) throw new TypeError('bad version part: ' + p);
      return Number(p);
    });
  };
  const pa = parts(a), pb = parts(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0, y = pb[i] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}
`,
  },
  {
    id: 'money',
    task: 'Implement the file money.mjs. It must export a named function `parseMoney(str)` that parses a money string (like "$1,234.56") and returns its numeric value.',
    seeds: [
      ['note-money-format', 'Money house spec: the return value is an INTEGER number of cents, never a float of dollars ("$1.50" → 150). A leading "$" is optional; commas are thousands separators and are ignored; at most two decimal digits are allowed.'],
      ['note-money-edges', 'Money edge rules: accounting negatives use parentheses — "(1.00)" means minus one dollar → -100; a bare minus sign is NOT valid and must throw a RangeError; empty or non-string input must throw a TypeError.'],
      decoy(1),
    ],
    suite: `
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMoney } from './money.mjs';
test('returns integer cents', () => assert.equal(parseMoney('$1.50'), 150));
test('thousands separators ignored', () => assert.equal(parseMoney('$1,234.56'), 123456));
test('dollar sign optional', () => assert.equal(parseMoney('12'), 1200));
test('parentheses mean negative', () => assert.equal(parseMoney('(1.00)'), -100));
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
  if (s.startsWith('(') && s.endsWith(')')) { neg = true; s = s.slice(1, -1); }
  if (s.includes('-')) throw new RangeError('bare minus is not valid money syntax');
  s = s.replace(/^\\$/, '').replace(/,/g, '');
  const m = /^(\\d+)(?:\\.(\\d{1,2}))?$/.exec(s);
  if (!m) throw new RangeError('unparseable money: ' + str);
  const cents = Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0') || 0);
  return neg ? -cents : cents;
}
`,
  },
  {
    id: 'hexcolor',
    task: 'Implement the file hexcolor.mjs. It must export a named function `parseColor(str)` that parses a hex color string (like "#aabbcc") and returns an object { r, g, b }.',
    seeds: [
      ['note-color-format', 'Color house spec: the leading "#" is optional; hex digits are case-insensitive; the 3-digit shorthand expands by doubling each digit ("#abc" equals "#aabbcc").'],
      ['note-color-edges', 'Color edge rules: only lengths 3 and 6 (after any "#") are valid — anything else must throw a RangeError; a non-hex character must throw a RangeError; non-string input must throw a TypeError.'],
      decoy(2),
    ],
    suite: `
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseColor } from './hexcolor.mjs';
test('six digits', () => assert.deepEqual(parseColor('#336699'), { r: 51, g: 102, b: 153 }));
test('hash optional', () => assert.deepEqual(parseColor('336699'), { r: 51, g: 102, b: 153 }));
test('case-insensitive', () => assert.deepEqual(parseColor('#AABBCC'), { r: 170, g: 187, b: 204 }));
test('3-digit shorthand doubles', () => assert.deepEqual(parseColor('#abc'), { r: 170, g: 187, b: 204 }));
test('bad length throws RangeError', () => assert.throws(() => parseColor('#abcd'), RangeError));
test('non-hex char throws RangeError', () => assert.throws(() => parseColor('#33669g'), RangeError));
test('non-string throws TypeError', () => assert.throws(() => parseColor(0x336699), TypeError));
`,
    reference: `
export function parseColor(str) {
  if (typeof str !== 'string') throw new TypeError('color must be a string');
  let s = str.startsWith('#') ? str.slice(1) : str;
  if (s.length === 3) s = [...s].map((c) => c + c).join('');
  if (s.length !== 6) throw new RangeError('color must have 3 or 6 hex digits');
  if (!/^[0-9a-fA-F]{6}$/.test(s)) throw new RangeError('non-hex character in color');
  return { r: parseInt(s.slice(0, 2), 16), g: parseInt(s.slice(2, 4), 16), b: parseInt(s.slice(4, 6), 16) };
}
`,
  },
  {
    id: 'initials',
    task: 'Implement the file initials.mjs. It must export a named function `initials(name)` that returns the initials of a person\'s name (like "Ada Lovelace" → "AL").',
    seeds: [
      ['note-initials-format', 'Initials house spec: at most the FIRST and LAST name parts contribute ("Anna Maria Luisa Weber" → "AW"); output is always uppercase; hyphenated surnames contribute both halves ("Ada Lovelace-King" → "ALK").'],
      ['note-initials-edges', 'Initials edge rules: lowercase connector particles (van, von, de, da, la, bin) are skipped when choosing the last part ("Ludwig van Beethoven" → "LB"); an empty or whitespace-only name must throw a RangeError; non-string input must throw a TypeError.'],
      decoy(3),
    ],
    suite: `
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initials } from './initials.mjs';
test('first and last', () => assert.equal(initials('Ada Lovelace'), 'AL'));
test('single name', () => assert.equal(initials('Plato'), 'P'));
test('middle names do not contribute', () => assert.equal(initials('Anna Maria Luisa Weber'), 'AW'));
test('uppercased output', () => assert.equal(initials('ada lovelace'), 'AL'));
test('hyphenated surname contributes both halves', () => assert.equal(initials('Ada Lovelace-King'), 'ALK'));
test('connector particles are skipped', () => assert.equal(initials('Ludwig van Beethoven'), 'LB'));
test('empty name throws RangeError', () => assert.throws(() => initials('   '), RangeError));
test('non-string throws TypeError', () => assert.throws(() => initials(42), TypeError));
`,
    reference: `
export function initials(name) {
  if (typeof name !== 'string') throw new TypeError('name must be a string');
  const PARTICLES = new Set(['van', 'von', 'de', 'da', 'la', 'bin']);
  const parts = name.trim().split(/\\s+/).filter(Boolean);
  if (parts.length === 0) throw new RangeError('name must not be empty');
  const letters = (p) => p.split('-').map((h) => h[0]).join('');
  if (parts.length === 1) return letters(parts[0]).toUpperCase();
  let pick = parts.length - 1;
  while (pick > 1 && PARTICLES.has(parts[pick].toLowerCase())) pick -= 1;
  return (letters(parts[0]) + letters(parts[pick])).toUpperCase();
}
`,
  },
];
