// format.mjs — shared label formatter
export function formatLabel(item = {}, opts = {}) {
  let label = item.name == null ? '(unnamed)' : String(item.name);

  if (item.id != null) label += `#${item.id}`;
  if (item.qty != null) label += ` ×${item.qty}`;
  if (item.cents != null) label += ` — $${(item.cents / 100).toFixed(2)}`;
  if (Array.isArray(item.tags) && item.tags.length) {
    label += ` [${item.tags.join(',')}]`;
  }

  if (item.deprecated) label = `~~${label}~~`;

  if (opts.max != null && label.length > opts.max) {
    label = label.slice(0, Math.max(0, opts.max - 1)) + '…';
  }

  if (opts.upper) label = label.toUpperCase();

  return label;
}