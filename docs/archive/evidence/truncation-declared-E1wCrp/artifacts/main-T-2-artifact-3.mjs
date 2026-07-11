// format.mjs — shared label formatter
export function formatLabel(item = {}, opts = {}) {
  let label = String(item.name ?? '');

  // deprecated wraps the name in tildes (test: legacy → "~~OldApi~~")
  if (item.deprecated) label = `~~${label}~~`;

  // tags comma-joined in brackets (test: badge)
  if (Array.isArray(item.tags) && item.tags.length) {
    label += ` [${item.tags.join(',')}]`;
  }

  // price: em-dash dollars from cents (test: price → "Widget — $1.50")
  if (item.priceCents != null) {
    label += ` — $${(item.priceCents / 100).toFixed(2)}`;
  }

  // qty: multiplication-sign suffix (test: qty)
  if (item.qty != null) label += ` \u00d7${item.qty}`;

  // opts: narrow caller truncates to max; shout caller uppercases
  if (opts.max != null) label = label.slice(0, opts.max);
  if (opts.upper) label = label.toUpperCase();

  return label;
}