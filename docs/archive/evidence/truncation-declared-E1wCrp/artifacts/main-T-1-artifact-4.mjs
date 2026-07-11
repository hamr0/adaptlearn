// format.mjs — shared label formatter
export function formatLabel(item = {}, opts = {}) {
  let label = String(item?.name ?? '');

  if (item?.deprecated) label = `~${label}~`;
  if (opts?.upper) label = label.toUpperCase();
  if (opts?.max != null && label.length > opts.max) {
    label = label.slice(0, opts.max) + '…';            // ⚠ unverified: max vs max-1
  }
  if (item?.price != null) label += ` — $${(item.price / 100).toFixed(2)}`;
  if (item?.qty != null) label += ` ×${item.qty}`;
  if (Array.isArray(item?.tags) && item.tags.length) label += ` [${item.tags.join(',')}]`;
  if (item?.id != null) label += `#${item.id}`;         // ⚠ unverified: raw id vs computed hash

  return label;
}