// format.mjs — shared label formatter
export function formatLabel(item = {}, opts = {}) {
  let label = String(item?.name ?? '');

  // price: integer cents → " — $D.DD"  (verified: 150 → "Widget — $1.50")
  if (item?.cents != null) {
    label += ` — $${(item.cents / 100).toFixed(2)}`;
  }

  // qty: → " ×N"  (INFERRED from the test title, exact input/output truncated)
  if (item?.qty != null) {
    label += ` ×${item.qty}`;
  }

  // badge: tags → " [a,b]"  (verified: ['fast','io'] → "Cache [fast,io]")
  if (Array.isArray(item?.tags) && item.tags.length) {
    label += ` [${item.tags.join(',')}]`;
  }

  // legacy caller passes { deprecated: true } — GUESS, no test visible for the marker
  if (item?.deprecated) {
    label += ' (deprecated)';
  }

  // narrow caller passes { max } — GUESS: plain truncation, no ellipsis, no test visible
  if (opts?.max != null && label.length > opts.max) {
    label = label.slice(0, opts.max);
  }

  // shout caller passes { upper: true } — GUESS at ordering (applied last)
  if (opts?.upper) {
    label = label.toUpperCase();
  }

  return label; // anon caller: formatLabel({}) → ""
}