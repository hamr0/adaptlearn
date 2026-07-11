// format.mjs — shared label formatter
//
// House rules (one per caller module), composed here:
//   - missing name        → '(unnamed)'                (callers/anon.mjs)
//   - id                  → 'Name#42'                  (callers/keyed.mjs)
//   - qty                 → 'Name ×3'                  (callers/qty.mjs)
//   - tags                → 'Name [a,b]'               (callers/badge.mjs)
//   - cents (integer)     → 'Name — $1.50'             (callers/price.mjs)
//   - deprecated          → '~~Name~~'                 (callers/legacy.mjs)
//   - opts.max            → truncate to max chars, '…' (callers/narrow.mjs)
//   - opts.upper          → uppercase whole label      (callers/shout.mjs)
export function formatLabel(item = {}, opts = {}) {
  const hasName = item.name != null && String(item.name) !== '';
  let label = hasName ? String(item.name) : '(unnamed)';

  if (item.id != null) {
    label += `#${item.id}`;
  }

  if (item.qty != null) {
    label += ` ×${item.qty}`;
  }

  if (Array.isArray(item.tags) && item.tags.length > 0) {
    label += ` [${item.tags.join(',')}]`;
  }

  if (item.cents != null) {
    label += ` — $${(item.cents / 100).toFixed(2)}`;
  }

  if (item.deprecated) {
    label = `~~${label}~~`;
  }

  if (opts.max != null && label.length > opts.max) {
    label = label.slice(0, Math.max(0, opts.max - 1)) + '…';
  }

  if (opts.upper) {
    label = label.toUpperCase();
  }

  return label;
}