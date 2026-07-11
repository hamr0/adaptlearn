// format.mjs — shared label formatter
//
// Builds a human-readable label from an item using the shared "house style"
// typography: a bracketed tag badge, an em-dash price, and a ×-sign quantity.
// Presentation-only concerns (upper-casing, max width) come in via `opts`.

export function formatLabel(item = {}, opts = {}) {
  let label = String(item.name ?? '');

  // Tag badge: comma-joined inside square brackets — "Cache [fast,io]".
  if (Array.isArray(item.tags) && item.tags.length > 0) {
    label += ` [${item.tags.join(',')}]`;
  }

  // Price: integer cents rendered as dollars after an em-dash — "Widget — $1.50".
  const cents = item.priceCents ?? item.cents;
  if (cents != null && cents !== '') {
    label += ` — $${(Number(cents) / 100).toFixed(2)}`;
  }

  // Quantity: multiplication-sign suffix — "Widget ×3".
  const qty = item.qty ?? item.quantity;
  if (qty != null && qty !== '') {
    label += ` ×${qty}`;
  }

  // Deprecated items carry a trailing marker.
  if (item.deprecated) {
    label += ' (deprecated)';
  }

  // Presentation options (callers pass these via the second argument).
  if (opts.max != null && label.length > opts.max) {
    label = label.slice(0, opts.max);
  }
  if (opts.upper) {
    label = label.toUpperCase();
  }

  return label;
}