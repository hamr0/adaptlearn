// format.mjs — shared label formatter
export function formatLabel(item = {}, opts = {}) {
  const raw = item.name ?? '';
  let label = String(raw) === '' ? '(unnamed)' : String(raw);

  if (item.id !== undefined && item.id !== null) {
    label += `#${item.id}`;
  }
  if (item.qty !== undefined && item.qty !== null) {
    label += ` ×${item.qty}`;
  }
  if (item.cents !== undefined && item.cents !== null) {
    label += ` — $${(Number(item.cents) / 100).toFixed(2)}`;
  }
  if (Array.isArray(item.tags) && item.tags.length > 0) {
    label += ` [${item.tags.join(',')}]`;
  }
  if (item.deprecated) {
    label = `~~${label}~~`;
  }

  if (opts.upper) {
    label = label.toUpperCase();
  }
  if (typeof opts.max === 'number' && label.length > opts.max) {
    label = label.slice(0, Math.max(0, opts.max - 1)) + '…';
  }

  return label;
}