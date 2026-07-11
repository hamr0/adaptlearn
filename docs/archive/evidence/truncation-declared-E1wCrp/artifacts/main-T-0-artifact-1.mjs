// format.mjs — shared label formatter
//
// formatLabel(item, opts) turns an item into a display label.
//
// Contract inferred from the shared callers:
//   item.name        base text; missing/nullish → '' (see anon.mjs: formatLabel({}))
//   item.deprecated  when truthy, mark the label as deprecated (legacy.mjs)
//   opts.upper       uppercase the result (shout.mjs)
//   opts.max         clamp the result to at most `max` characters (narrow.mjs)
//
// Order matters: build the base text, annotate it (deprecated), transform it
// (upper), then constrain its length (max) so the cap is honored last.
export function formatLabel(item = {}, opts = {}) {
  const it = item ?? {};
  const o = opts ?? {};

  let label = String(it.name ?? '');

  if (it.deprecated) {
    label = label ? `${label} (deprecated)` : '(deprecated)';
  }

  if (o.upper) {
    label = label.toUpperCase();
  }

  if (Number.isFinite(o.max) && o.max >= 0 && label.length > o.max) {
    label = label.slice(0, o.max);
  }

  return label;
}