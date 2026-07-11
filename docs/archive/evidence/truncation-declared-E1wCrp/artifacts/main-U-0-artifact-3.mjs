// format.mjs — shared label formatter

const ELLIPSIS = '…';

export function formatLabel(item = {}, opts = {}) {
  let label = String(item.name ?? '');

  // qty: multiplication-sign suffix
  if (item.qty != null) {
    label += ` ×${item.qty}`;
  }

  // price: em-dash dollars from cents
  if (item.cents != null) {
    label += ` — $${(item.cents / 100).toFixed(2)}`;
  }

  // badge: tags comma-joined in brackets
  if (Array.isArray(item.tags) && item.tags.length > 0) {
    label += ` [${item.tags.join(', ')}]`;
  }

  // legacy: deprecated wraps in tildes
  if (item.deprecated) {
    label = `~~${label}~~`;
  }

  // shout: upper option uppercases
  if (opts.upper) {
    label = label.toUpperCase();
  }

  // narrow: max truncates with ellipsis (total length stays within max)
  if (opts.max != null && label.length > opts.max) {
    label = label.slice(0, opts.max - 1) + ELLIPSIS;
  }

  return label;
}