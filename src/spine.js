// The stigmergic floor's event spine: append-only JSONL, one event per line.
// Pattern carried from relayfact (copy the pattern, not the code): `seq` is
// monotonic per spine, `ts` is stamped last and is always the final key, and
// consumers are pure listeners — nothing here reads the file back.

import { appendFileSync } from 'node:fs';

/**
 * Create an emitter bound to one JSONL file.
 * @param {string} file absolute path; created on first emit
 * @returns {(type: string, data?: object) => object} emit — returns the event as written
 */
export function makeSpine(file) {
  let seq = 0;
  return function emit(type, data = {}) {
    const ev = { type, ...data, seq: ++seq };
    ev.ts = new Date().toISOString();
    appendFileSync(file, JSON.stringify(ev) + '\n');
    return ev;
  };
}
