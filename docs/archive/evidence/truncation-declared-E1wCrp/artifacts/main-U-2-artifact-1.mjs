// format.mjs — shared label formatter
export function formatLabel(item = {}, opts = {}) {
  const it = item ?? {};
  const options = opts ?? {};

  let label = String(it.name ?? '');

  // legacy.mjs: items flagged deprecated get a visible marker.
  if (it.deprecated) {
    label = label ? `${label} (deprecated)` : '(deprecated)';
  }

  // narrow.mjs: opts.max caps the rendered width, with an ellipsis when clipped.
  const { max } = options;
  if (typeof max === 'number' && Number.isFinite(max) && max >= 0 && label.length > max) {
    label = max <= 1 ? label.slice(0, max) : `${label.slice(0, max - 1)}…`;
  }

  // shout.mjs: opts.upper uppercases the final label.
  if (options.upper) {
    label = label.toUpperCase();
  }

  return label;
}