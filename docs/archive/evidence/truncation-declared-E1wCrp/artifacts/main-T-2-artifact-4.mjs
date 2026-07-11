// format.mjs — shared label formatter
export function formatLabel(item = {}, opts = {}) {
  const it = item ?? {};
  const o = opts ?? {};

  let label = String(it.name ?? '');

  // legacy: deprecated names wrap in tildes
  if (it.deprecated) label = `~${label}~`;

  // price: em-dash dollars from cents
  if (it.cents != null) {
    label += ` — $${(Number(it.cents) / 100).toFixed(2)}`;
  }

  // qty: multiplication-sign suffix
  if (it.qty != null) {
    label += ` ×${it.qty}`;
  }

  // badge: tags comma-joined in brackets
  if (Array.isArray(it.tags) && it.tags.length) {
    label += ` [${it.tags.join(', ')}]`;
  }

  // shout: upper option uppercases
  if (o.upper) label = label.toUpperCase();

  // narrow: max truncates with an ellipsis character
  if (o.max != null && label.length > o.max) {
    label = label.slice(0, Math.max(0, o.max - 1)) + '…';
  }

  return label;
}