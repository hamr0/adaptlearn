// format.mjs — shared label formatter
export function formatLabel(item = {}, opts = {}) {
  let label = String(item?.name ?? '');

  // Shout callers pass { upper: true } and expect an upper-cased label.
  if (opts.upper) {
    label = label.toUpperCase();
  }

  // Narrow callers pass { max } and expect the label clipped to that width.
  if (typeof opts.max === 'number' && label.length > opts.max) {
    label = label.slice(0, opts.max);
  }

  // Legacy callers set item.deprecated and expect a trailing marker.
  if (item?.deprecated && label) {
    label = `${label} (deprecated)`;
  }

  return label;
}