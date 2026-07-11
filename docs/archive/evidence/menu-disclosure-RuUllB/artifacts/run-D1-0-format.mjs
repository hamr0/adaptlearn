// format.mjs — shared label formatter
export function formatLabel(item = {}, opts = {}) {
  let label =
    item.name != null && String(item.name).length > 0
      ? String(item.name)
      : '(unnamed)';

  if (item.id != null) label += `#${item.id}`;
  if (item.qty != null) label += ` ×${item.qty}`;
  if (Array.isArray(item.tags) && item.tags.length > 0) {
    label += ` [${item.tags.join(',')}]`;
  }
  if (item.cents != null) {
    label += ` — $${(Number(item.cents) / 100).toFixed(2)}`;
  }
  if (item.deprecated) label = `~~${label}~~`;
  if (opts.upper) label = label.toUpperCase();
  if (opts.max != null && label.length > opts.max) {
    label = label.slice(0, Math.max(0, opts.max - 1)) + '…';
  }

  return label;
}