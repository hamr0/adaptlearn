// format.mjs — shared label formatter
//
// formatLabel(item, opts) builds a display label. Callers rely on:
//   • tags        → comma-joined in square brackets:   Name [a, b]
//   • priceCents  → dollars, offset by an em-dash:      Name — $12.34
//   • qty         → multiplication-sign suffix:         Name ×3
//   • deprecated  → whole label wrapped in tildes:      ~~Name~~
//   • opts.upper  → finished label is uppercased:       NAME

const MULT = '\u00D7';   // × multiplication sign (not the letter x)
const EMDASH = '\u2014'; // — em dash

export function formatLabel(item = {}, opts = {}) {
  let label = String(item.name ?? item.label ?? '');

  if (Array.isArray(item.tags) && item.tags.length > 0) {
    label += ` [${item.tags.join(', ')}]`;
  }

  if (Number.isFinite(item.priceCents)) {
    label += ` ${EMDASH} $${(item.priceCents / 100).toFixed(2)}`;
  }

  if (Number.isFinite(item.qty)) {
    label += ` ${MULT}${item.qty}`;
  }

  if (item.deprecated) {
    label = `~~${label}~~`;
  }

  if (opts.upper) {
    label = label.toUpperCase();
  }

  return label;
}