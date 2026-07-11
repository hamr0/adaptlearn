#!/usr/bin/env node
// upstream-ledger — reference implementation of the bareloop incident-monitoring
// feature (design docs/plans/2026-07-11-upstream-ledger-design.md). Stdlib only.
//
// A pure listener over run spines: classifies primitive/lib failures into a
// deduplicated, append-only JSONL ledger that consumers read to debug workflows
// and the maintainer reads to drive upstream fixes (A1/A2/A3 flow, mechanized).
// Spines stay ground truth — delete the ledger, re-run, same fold.
//
// Usage:
//   node poc/upstream-ledger.mjs [--ledger FILE] <spineDirOrFile>...
//   node poc/upstream-ledger.mjs --ledger FILE --status KEY=filed --ref "UPSTREAM-ASKS A4"
//   node poc/upstream-ledger.mjs --selftest
//
// Throwaway per house rules; graduates into bareloop by rewrite.

import { readFileSync, appendFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import assert from 'node:assert/strict';

// ---- vocabulary: verb -> owning lib (bareloop widens this map per suite) ----
const VERB_LIB = {
  recall: 'litectx', compress: 'litectx', stash: 'litectx', remember: 'litectx',
  impact: 'litectx', get: 'litectx', index: 'litectx', peek: 'litectx', assemble: 'litectx',
  provider: 'bareagent', loop: 'bareagent', gate: 'bareguard', writeScope: 'bareguard',
};
const PROVIDER_RX = /provider|clipipe|timed out|exited with code|anthropic|ollama/i;
const VERB_RX = /\b(recall|impact|remember|stash|compress|index|store|litectx)\b/i;

// detail normalization: strip paths, numbers, hex — same bug dedupes across worlds
const normalize = (s) => String(s ?? '').replace(/\/[^\s"']+/g, '<path>').replace(/0x[0-9a-f]+/gi, '<hex>').replace(/\d+/g, '<n>').slice(0, 300);
const sig = (s) => { let h = 5381; for (const c of normalize(s)) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0; return h.toString(16).padStart(8, '0').slice(0, 8); };

const ASK_TEMPLATES = {
  'provider-red': (v, d) => `bareagent: provider seam failed mid-run — ${d.slice(0, 120)}; classify/harden at the provider boundary`,
  'runtime-red': (v, d) => `${VERB_LIB[v] ?? 'unknown-lib'}: \`${v ?? '?'}\` threw at runtime — ${d.slice(0, 120)}`,
  'config-red': (v) => `validator/vocabulary drift around \`${v ?? '?'}\` — config-red at bind time`,
  'retention-red': (v, d) => `litectx: post-green retention failed (remember) — ${d.slice(0, 120)}`,
  'request-red': (v) => `capability ask: \`${v}\` requested while locked/absent — admission or upstream-build candidate (frequency-weighted)`,
  'capability-gap': (v) => `capability gap: run cap-halted while requesting \`${v}\` — the admitted menu lacks a load-bearing primitive`,
  'broken-close': (v, d) => `consumer: the close itself cannot run — ${d.slice(0, 120)} (job-owner fix, not a lib ask)`,
  'silent-degradation': (v, d) => `SILENT: per-job smoke for \`${v}\` returned a false known-answer — ${d.slice(0, 120)} (the A3 class; loudest priority)`,
};
const SEVERITY = ['silent-degradation', 'runtime-red', 'provider-red', 'broken-close', 'capability-gap', 'retention-red', 'config-red', 'request-red'];

/** Classify ONE spine (array of events) into incident observations. */
export function classifySpine(events, ref = {}) {
  const out = [];
  const requested = new Set(); // ops asked via request-red in this spine
  const obs = (cls, verb, detail, ev) => out.push({
    class: cls, verb: verb ?? null, lib: VERB_LIB[verb] ?? (cls === 'provider-red' ? 'bareagent' : cls === 'broken-close' ? 'consumer' : 'unknown'),
    detail: normalize(detail), sig: sig(detail), sample: { ...ref, seq: ev.seq ?? null, iteration: ev.iteration ?? null },
  });
  for (const e of events) {
    if (e.type === 'config-red') obs('config-red', e.code?.split(':')[1] ?? null, e.code ?? e.detail ?? '', e);
    else if (e.type === 'retention-red') obs('retention-red', 'remember', e.detail ?? '', e);
    else if (e.type === 'request-red') { requested.add(e.op); obs('request-red', e.op, e.meaning ?? 'locked primitive requested', e); }
    else if (e.type === 'primitive-smoke' && e.ok === false) obs('silent-degradation', e.verb, e.detail ?? 'known-answer smoke failed', e);
    else if (e.type === 'escalation') {
      const d = e.detail ?? '';
      if (e.category === 'provider-red') obs('provider-red', 'provider', d, e);
      else if (e.category === 'broken-close') obs('broken-close', null, d, e);
      else if (e.category === 'interpreter-red') {
        if (PROVIDER_RX.test(d)) obs('provider-red', 'provider', d, e);
        else obs('runtime-red', VERB_RX.exec(d)?.[1]?.toLowerCase() ?? null, d, e);
      } else if (e.category === 'cap-halt' && requested.size) {
        for (const v of requested) obs('capability-gap', v, `cap-halt after ${e.spend?.runs ?? '?'} runs with '${v}' requested`, e);
      }
    }
  }
  return out;
}

// ---- ledger fold: latest state per key from append-only rows ----
export function foldLedger(rows) {
  const state = new Map();
  for (const r of rows) {
    if (r.type === 'lib-incident') state.set(r.key, { ...state.get(r.key), ...r, status: state.get(r.key)?.status ?? 'open' });
    else if (r.type === 'lib-incident-status') { const s = state.get(r.key); if (s) { s.status = r.status; s.statusRef = r.ref ?? null; } }
  }
  return state;
}

const readJsonl = (p) => existsSync(p) ? readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) : [];
const appendRow = (p, row, seq) => appendFileSync(p, JSON.stringify({ ...row, seq, ts: new Date().toISOString() }) + '\n');

function collectSpineFiles(paths) {
  const files = [];
  for (const p of paths) {
    const st = statSync(p);
    if (st.isFile()) files.push(p);
    else for (const f of readdirSync(p, { recursive: true })) if (String(f).endsWith('.jsonl')) files.push(join(p, String(f)));
  }
  return files.filter((f) => !basename(f).startsWith('upstream'));
}

// ---- selftest: fixtures per class, incl. one that must produce NOTHING ----
if (process.argv.includes('--selftest')) {
  const mk = (events) => classifySpine(events, { world: 'w', cell: 'c' });
  assert.equal(mk([{ type: 'escalation', category: 'interpreter-red', detail: '[CLIPipeProvider] process exited with code 1', seq: 5 }])[0].class, 'provider-red', 'provider crash classifies provider-red');
  assert.equal(mk([{ type: 'escalation', category: 'interpreter-red', detail: 'litectx recall: store missing', seq: 2 }])[0].class, 'runtime-red', 'lib throw classifies runtime-red');
  assert.equal(mk([{ type: 'request-red', op: 'impact', seq: 3 }])[0].class, 'request-red', 'ask classifies request-red');
  const gap = mk([{ type: 'request-red', op: 'impact', seq: 3 }, { type: 'escalation', category: 'cap-halt', spend: { runs: 4 }, seq: 9 }]);
  assert.ok(gap.some((o) => o.class === 'capability-gap' && o.verb === 'impact'), 'request+cap-halt composes capability-gap');
  assert.equal(mk([{ type: 'escalation', category: 'cap-halt', spend: { runs: 4 }, seq: 9 }]).length, 0, 'bare cap-halt is a budget story — NO incident (the must-fail negative)');
  assert.equal(mk([{ type: 'primitive-smoke', ok: false, verb: 'impact', detail: 'expected 8 callers, got 0', seq: 1 }])[0].class, 'silent-degradation', 'false smoke classifies silent-degradation');
  assert.equal(mk([{ type: 'close-verdict', verdict: 'needs_revision', gap: 'not ok 1', seq: 4 }]).length, 0, 'close reds are never lib incidents (§5b)');
  const same = sig('[CLIPipeProvider] timed out after 180000ms'), other = sig('[CLIPipeProvider] timed out after 179999ms');
  assert.equal(same, other, 'number-normalized details dedupe');
  console.log('selftest: 8/8 green');
  process.exit(0);
}

// ---- status append mode ----
const argv = process.argv.slice(2);
const opt = (name, def) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : def; };
const ledgerPath = opt('--ledger', 'upstream-ledger.jsonl');
const statusArg = opt('--status', null);
if (statusArg) {
  const [key, status] = statusArg.split('=');
  const rows = readJsonl(ledgerPath);
  assert.ok(foldLedger(rows).has(key), `unknown incident key: ${key}`);
  appendRow(ledgerPath, { type: 'lib-incident-status', key, status, ref: opt('--ref', null) }, rows.length + 1);
  console.log(`status: ${key} -> ${status}`);
  process.exit(0);
}

// ---- collect mode ----
const inputs = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--ledger' && argv[i - 1] !== '--status' && argv[i - 1] !== '--ref');
if (!inputs.length) { console.error('usage: upstream-ledger.mjs [--ledger FILE] <spineDirOrFile>... | --status KEY=STATE --ref REF | --selftest'); process.exit(2); }

const observed = new Map(); // key -> { ...incident, occurrences, samples }
for (const f of collectSpineFiles(inputs)) {
  const world = basename(dirname(dirname(f))).replace(/^.*?-(?=[^-]+$)/, '') || basename(dirname(f));
  const cell = basename(f, '.jsonl');
  for (const o of classifySpine(readJsonl(f), { world, cell })) {
    const key = `${o.lib}:${o.verb ?? '-'}:${o.class}:${o.sig}`;
    const cur = observed.get(key) ?? { key, lib: o.lib, verb: o.verb, class: o.class, sig: o.sig, detail: o.detail, occurrences: 0, samples: [] };
    cur.occurrences += 1;
    if (cur.samples.length < 3) cur.samples.push(o.sample);
    observed.set(key, cur);
  }
}

const prior = foldLedger(readJsonl(ledgerPath));
let seq = readJsonl(ledgerPath).length;
let appended = 0;
for (const inc of observed.values()) {
  const p = prior.get(inc.key);
  if (!p || (p.occurrences ?? 0) < inc.occurrences) {
    appendRow(ledgerPath, { type: 'lib-incident', ...inc, suggestedAsk: ASK_TEMPLATES[inc.class]?.(inc.verb, inc.detail) ?? '' }, ++seq);
    appended += 1;
  }
}

// ---- the folded view (worst-first) ----
const fold = foldLedger(readJsonl(ledgerPath));
const rows = [...fold.values()].sort((a, b) => SEVERITY.indexOf(a.class) - SEVERITY.indexOf(b.class) || b.occurrences - a.occurrences);
console.log(`upstream-ledger: ${fold.size} incident(s), ${appended} row(s) appended -> ${ledgerPath}\n`);
for (const r of rows) {
  console.log(`[${r.status.toUpperCase()}${r.statusRef ? ` ${r.statusRef}` : ''}] ${r.class} ${r.lib}:${r.verb ?? '-'} ×${r.occurrences}  (${r.key})`);
  console.log(`    ${r.detail.slice(0, 110)}`);
  console.log(`    ask: ${r.suggestedAsk?.slice(0, 110) ?? '-'}`);
  console.log(`    seen: ${r.samples.map((s) => `${s.world}/${s.cell}@${s.seq}`).join(', ')}`);
}
