export function formatLabel(item = {}, opts = {}) {
  let label = item.name != null && String(item.name) !== ''
    ? String(item.name)
    : '(unnamed)';

  if (Array.isArray(item.tags) && item.tags.length > 0) {
    label += ` [${item.tags.join(',')}]`;
  }

  if (Number.isInteger(item.cents)) {
    label += ` — $${(item.cents / 100).toFixed(2)}`;
  }

  if (item.qty != null) {
    label += ` ×${item.qty}`;
  }

  if (item.id != null) {
    label += `#${item.id}`;
  }

  if (item.deprecated) {
    label = `~~${label}~~`;
  }

  if (opts.max != null && label.length > opts.max) {
    label = label.slice(0, opts.max - 1) + '…';
  }

  if (opts.upper) {
    label = label.toUpperCase();
  }

  return label;
}