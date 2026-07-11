// format.mjs — shared label formatter
export function formatLabel(item = {}, opts = {}) {
  let label = String(item?.name ?? '');

  // qty: multiplication-sign suffix — ASSUMED format "name ×N"
  if (item?.qty != null) label += ` ×${item.qty}`;

  // price: em-dash dollars from cents
  if (item?.cents != null) label += ` — $${(item.cents / 100).toFixed(2)}`;

  // badge: tags comma-joined in brackets
  if (Array.isArray(item?.tags) && item.tags.length) {
    label += ` [${item.tags.join(',')}]`;
  }

  // deprecated flag — ASSUMED, no visible spec
  if (item?.deprecated) label += ' (deprecated)';

  // max: truncate — ASSUMED ellipsis form
  if (opts?.max != null && label.length > opts.max) {
    label = label.slice(0, opts.max);
  }

  // upper — ASSUMED whole-string uppercase
  if (opts?.upper) label = label.toUpperCase();

  return label;
}