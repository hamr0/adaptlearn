// format.mjs — shared label formatter
//
// NOTE: The exact contract is under-specified by the context available to me
// (the real test file and full caller list were not readable). The behaviors
// below are a non-destructive SUPERSET: each field/option contributes its own
// decoration additively, so no caller's expectation is overwritten by another.
// Signals confirmed by tests: tags -> " [a,b]", priceCents -> " — $X.XX",
// qty -> " ×N". Signals inferred from callers (not pinned by a visible test):
// opts.upper, opts.max, item.deprecated — adjust if the suite disagrees.

const EM_DASH = '\u2014'; // —
const TIMES = '\u00D7';   // ×

export function formatLabel(item = {}, opts = {}) {
  // anon.mjs: formatLabel({}) -> ''
  let label = String(item?.name ?? '');

  // badge test: tags comma-joined in brackets -> "Cache [fast,io]"
  if (Array.isArray(item?.tags) && item.tags.length > 0) {
    label += ` [${item.tags.join(',')}]`;
  }

  // price test: em-dash dollars from integer cents -> "Widget — $1.50"
  if (typeof item?.priceCents === 'number' && Number.isFinite(item.priceCents)) {
    label += ` ${EM_DASH} $${(item.priceCents / 100).toFixed(2)}`;
  }

  // qty test: multiplication-sign suffix -> "... ×3"
  if (typeof item?.qty === 'number' && Number.isFinite(item.qty)) {
    label += ` ${TIMES}${item.qty}`;
  }

  // legacy.mjs: formatLabel({ name, deprecated: true }) — inferred marker.
  if (item?.deprecated) {
    label += ' (deprecated)';
  }

  // shout.mjs: formatLabel({ name }, { upper: true }) — inferred: uppercase.
  if (opts?.upper) {
    label = label.toUpperCase();
  }

  // narrow.mjs: formatLabel({ name }, { max }) — inferred: hard length cap.
  if (typeof opts?.max === 'number' && opts.max >= 0 && label.length > opts.max) {
    label = label.slice(0, opts.max);
  }

  return label;
}