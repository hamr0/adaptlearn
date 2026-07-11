// format.mjs — shared label formatter
//
// formatLabel(item, opts) builds a display label from an item record.
// Each caller exercises one facet; the transforms below are independent so
// they compose predictably regardless of which fields an item carries.

const PLACEHOLDER = '(untitled)';

export function formatLabel(item = {}, opts = {}) {
  const { name, id, tags, cents, qty, deprecated } = item;
  const { upper = false, max } = opts;

  // Base: the name, or a placeholder when it is missing/empty.
  let label = name == null || String(name) === '' ? PLACEHOLDER : String(name);

  // keyed: id hash suffix -> "Node#42"
  if (id != null) {
    label += `#${id}`;
  }

  // badge: tags comma-joined in brackets -> "Node [a,b,c]"
  if (Array.isArray(tags) && tags.length > 0) {
    label += ` [${tags.join(',')}]`;
  }

  // price: em-dash dollars from cents -> "Node — $12.34"
  if (typeof cents === 'number' && Number.isFinite(cents)) {
    label += ` — $${(cents / 100).toFixed(2)}`;
  }

  // qty: multiplication-sign suffix -> "Node ×3"
  if (typeof qty === 'number' && Number.isFinite(qty)) {
    label += ` ×${qty}`;
  }

  // legacy: deprecated wraps in tildes -> "~Node~"
  if (deprecated) {
    label = `~${label}~`;
  }

  // shout: upper option uppercases
  if (upper) {
    label = label.toUpperCase();
  }

  // narrow: max truncates with ellipsis
  if (typeof max === 'number' && max >= 0 && label.length > max) {
    label = label.slice(0, max) + '…';
  }

  return label;
}