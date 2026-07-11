// format.mjs — shared label formatter
//
// formatLabel(item, opts): builds a display label from an item's fields.
// Each caller sets one decorating field; opts carries presentation flags.
export function formatLabel(item = {}, opts = {}) {
  const it = item ?? {};
  const o = opts ?? {};

  let label = String(it.name ?? '');

  // legacy: a deprecated item wraps its name in tildes (markdown strikethrough)
  if (it.deprecated) {
    label = `~~${label}~~`;
  }

  // keyed: append the id as a "#" suffix
  if (it.id != null) {
    label = `${label} #${it.id}`;
  }

  // qty: multiplication-sign suffix, e.g. "Widget ×3"
  if (it.qty != null) {
    label = `${label} ×${it.qty}`;
  }

  // price: em-dash dollars rendered from an integer cent amount, e.g. "Widget — $1.50"
  if (it.price != null) {
    label = `${label} — $${(Number(it.price) / 100).toFixed(2)}`;
  }

  // badge: tags comma-joined inside brackets, e.g. "Widget [a, b]"
  if (Array.isArray(it.tags) && it.tags.length > 0) {
    label = `${label} [${it.tags.join(', ')}]`;
  }

  // narrow: cap the rendered length
  if (o.max != null && label.length > o.max) {
    label = label.slice(0, o.max);
  }

  // shout: force uppercase
  if (o.upper) {
    label = label.toUpperCase();
  }

  return label;
}