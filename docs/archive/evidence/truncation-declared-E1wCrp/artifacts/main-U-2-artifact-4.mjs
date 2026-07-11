// format.mjs — shared label formatter
export function formatLabel(item = {}, opts = {}) {
  item = item ?? {};
  opts = opts ?? {};

  let s = String(item.name ?? '');

  // badge: tags comma-joined in brackets — "Name [a,b]"
  if (Array.isArray(item.tags) && item.tags.length > 0) {
    s += ` [${item.tags.join(',')}]`;
  }

  // price: em-dash then dollars derived from cents — "Name — $12.99"
  if (item.cents != null && !Number.isNaN(Number(item.cents))) {
    s += ` — $${(Number(item.cents) / 100).toFixed(2)}`;
  }

  // qty: multiplication-sign suffix — "Name ×3"
  if (item.qty != null && !Number.isNaN(Number(item.qty))) {
    s += ` ×${item.qty}`;
  }

  // legacy: deprecated wraps in tildes — "~Name~"
  if (item.deprecated) {
    s = `~${s}~`;
  }

  // shout: upper option uppercases the whole label
  if (opts.upper) {
    s = s.toUpperCase();
  }

  // narrow: max truncates with a trailing ellipsis that counts toward max
  if (typeof opts.max === 'number' && s.length > opts.max) {
    s = s.slice(0, Math.max(0, opts.max - 1)) + '…';
  }

  return s;
}