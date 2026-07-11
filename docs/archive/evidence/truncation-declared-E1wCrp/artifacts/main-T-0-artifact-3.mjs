// format.mjs — shared label formatter
export function formatLabel(item = {}, opts = {}) {
  const parts = [];

  const name = String(item.name ?? '');
  if (name) parts.push(name);

  if (Array.isArray(item.tags) && item.tags.length) {
    parts.push(`[${item.tags.join(',')}]`);
  }

  if (item.qty != null) {
    parts.push(`×${item.qty}`);
  }

  if (typeof item.cents === 'number') {
    parts.push(`— $${(item.cents / 100).toFixed(2)}`);
  }

  let label = parts.join(' ');

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