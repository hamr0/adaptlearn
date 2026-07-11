// format.mjs — shared label formatter
export function formatLabel(item = {}, opts = {}) {
  let label = String(item.name ?? '');

  // tags → comma-joined in brackets (no spaces)
  if (Array.isArray(item.tags) && item.tags.length) {
    label += ` [${item.tags.join(',')}]`;
  }

  // cents → em-dash dollars
  if (item.cents != null) {
    label += ` —$${(item.cents / 100).toFixed(2)}`;
  }

  // qty → multiplication-sign suffix
  if (item.qty != null) {
    label += ` ×${item.qty}`;
  }

  // id → hash suffix
  if (item.id != null) {
    label += `#${item.id}`;
  }

  // deprecated → wrap in tildes
  if (item.deprecated) {
    label = `~${label}~`;
  }

  // upper option uppercases
  if (opts.upper) {
    label = label.toUpperCase();
  }

  // max → truncate with ellipsis, keeping result within max
  if (opts.max != null && label.length > opts.max) {
    label = label.slice(0, opts.max - 1) + '…';
  }

  return label;
}