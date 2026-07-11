// format.mjs — shared label formatter
export function formatLabel(item = {}, opts = {}) {
  let label = String(item?.name ?? '');
  if (item.id != null) label += ` #${item.id}`;
  if (item.qty != null) label += ` ×${item.qty}`;
  if (Array.isArray(item.tags) && item.tags.length) label += ` [${item.tags.join(', ')}]`;
  if (item.deprecated) label += ' (deprecated)';
  if (opts.max != null && label.length > opts.max) label = label.slice(0, opts.max);
  if (opts.upper) label = label.toUpperCase();
  return label;
}