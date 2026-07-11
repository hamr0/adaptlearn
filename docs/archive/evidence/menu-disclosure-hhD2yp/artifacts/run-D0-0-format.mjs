// format.mjs — shared label formatter
export function formatLabel(item = {}, opts = {}) {
  let s = String(item.name ?? '');

  // deprecated: wrap the name in tildes
  if (item.deprecated) s = `~~${s}~~`;

  // badge: tags comma-joined in brackets
  if (Array.isArray(item.tags) && item.tags.length) s = `[${item.tags.join(',')}]`;

  // price: em-dash dollars from cents
  if (typeof item.cents === 'number') {
    const dollars = Math.floor(item.cents / 100);
    const cents = String(Math.abs(item.cents % 100)).padStart(2, '0');
    s = `$${dollars}—${cents}`;
  }

  // qty: multiplication-sign suffix
  if (typeof item.qty === 'number') s = `${s}×${item.qty}`;

  // shout: upper option uppercases
  if (opts.upper) s = s.toUpperCase();

  // narrow: max truncates with an ellipsis (total length === max)
  if (typeof opts.max === 'number' && s.length > opts.max) {
    s = s.slice(0, Math.max(0, opts.max - 1)) + '…';
  }

  return s;
}