// format.mjs — shared label formatter
export function formatLabel(item = {}, opts = {}) {
  const it = item ?? {};
  const o = opts ?? {};

  let label = String(it.name ?? '');

  if (it.deprecated) {
    label = `${label} (deprecated)`;
  }

  if (o.upper) {
    label = label.toUpperCase();
  }

  if (typeof o.max === 'number' && o.max >= 0 && label.length > o.max) {
    label = label.slice(0, o.max);
  }

  return label;
}