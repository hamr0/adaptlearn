// format.mjs — shared label formatter
//
// formatLabel(item, opts) builds a display label from item fields + options.
//
// Confirmed by the shared test suite:
//   badge: { name:'Cache', tags:['fast','io'] } -> 'Cache [fast,io]'
//   price: { name:'Widget', cents:150 }         -> 'Widget — $1.50'   (em dash, cents/100)
//   qty:   { name:'Box',    qty:3 }             -> 'Box ×3'           (× = U+00D7)
//
// Caller-driven (callers/*.mjs):
//   shout.mjs   formatLabel({name}, {upper:true})   -> uppercased result
//   narrow.mjs  formatLabel({name}, {max})          -> name truncated to `max` chars
//   legacy.mjs  formatLabel({name, deprecated:true})-> label flagged deprecated
//   anon.mjs    formatLabel({})                     -> '' (missing name)
//
// NOTE: exact rendering of `deprecated`, `max` truncation, and `upper` could not be
// verified against the real suite (test file was unreadable here) — these follow the
// most conventional interpretation and may need tweaking if those subtests differ.

export function formatLabel(item = {}, opts = {}) {
  const { name, tags, cents, qty, deprecated } = item ?? {};
  const { upper = false, max } = opts ?? {};

  let label = String(name ?? '');

  // narrow: clamp the base name first so decorations are never clipped.
  if (typeof max === 'number' && max >= 0 && label.length > max) {
    label = max > 0 ? label.slice(0, max - 1) + '…' : '';
  }

  // qty: multiplication-sign suffix -> "Box ×3"
  if (qty != null) {
    label += ` ×${qty}`;
  }

  // price: em-dash dollars from cents -> "Widget — $1.50"
  if (cents != null) {
    label += ` — $${(Number(cents) / 100).toFixed(2)}`;
  }

  // badge: tags comma-joined in brackets -> "Cache [fast,io]"
  if (Array.isArray(tags) && tags.length > 0) {
    label += ` [${tags.join(',')}]`;
  }

  // legacy: deprecated items are flagged
  if (deprecated) {
    label += ' (deprecated)';
  }

  // shout: uppercase the finished label
  if (upper) {
    label = label.toUpperCase();
  }

  return label;
}