// format.mjs — shared label formatter
//
// House typographic style for labels:
//   • deprecated items are struck through with tildes:  ~~Name~~
//   • tags render comma-joined inside square brackets:  [a,b]
//   • prices come from integer cents, dollars and cents
//     separated by an em-dash:                          $1—50
//   • quantities render as a multiplication-sign suffix: ×3
//   • { upper } uppercases the whole label
//   • { max } truncates with a single ellipsis character,
//     the ellipsis counting toward the max length:      Extraor…
//
// Decorations are space-joined so a missing name never leaves a
// leading separator (e.g. formatLabel({}) === '').

export function formatLabel(item = {}, opts = {}) {
  let name = String(item.name ?? '');

  // Deprecated names are wrapped in tildes (skip when there's no name).
  if (item.deprecated && name) name = `~~${name}~~`;

  const parts = [];
  if (name) parts.push(name);

  // Tags: comma-joined inside brackets.
  if (Array.isArray(item.tags) && item.tags.length) {
    parts.push(`[${item.tags.join(',')}]`);
  }

  // Price: dollars and zero-padded cents joined by an em-dash.
  if (Number.isFinite(item.cents)) {
    const cents = Math.trunc(Math.abs(item.cents));
    const sign = item.cents < 0 ? '-' : '';
    const dollars = Math.floor(cents / 100);
    const remainder = String(cents % 100).padStart(2, '0');
    parts.push(`${sign}$${dollars}—${remainder}`);
  }

  // Quantity: multiplication-sign suffix.
  if (Number.isFinite(item.qty)) {
    parts.push(`×${item.qty}`);
  }

  let out = parts.join(' ');

  // Uppercase option applies to the assembled label.
  if (opts.upper) out = out.toUpperCase();

  // Max option truncates, reserving one slot for the ellipsis.
  if (Number.isFinite(opts.max) && out.length > opts.max) {
    out = out.slice(0, Math.max(0, opts.max - 1)) + '…';
  }

  return out;
}