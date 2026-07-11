// format.mjs — shared label formatter
//
// Shared entry point used by callers/*.mjs. Each caller exercises one
// optional behavior, layered in a fixed order so combinations stay stable:
//
//   1. base name   — String(item.name), empty string when absent (anon.mjs)
//   2. deprecated   — item.deprecated tags the label            (legacy.mjs)
//   3. max          — opts.max truncates with an ellipsis        (narrow.mjs)
//   4. upper        — opts.upper uppercases the final label      (shout.mjs)

export function formatLabel(item = {}, opts = {}) {
  const it = item ?? {};
  const o = opts ?? {};

  let label = String(it.name ?? '');

  if (it.deprecated) {
    label = label ? `${label} (deprecated)` : '(deprecated)';
  }

  if (typeof o.max === 'number' && o.max >= 0 && label.length > o.max) {
    label = o.max <= 1
      ? label.slice(0, o.max)
      : `${label.slice(0, o.max - 1)}…`;
  }

  if (o.upper) {
    label = label.toUpperCase();
  }

  return label;
}