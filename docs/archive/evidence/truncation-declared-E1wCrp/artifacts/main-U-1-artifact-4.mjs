// format.mjs — shared label formatter
export function formatLabel(item = {}, opts = {}) {
  const it = item ?? {};
  const o = opts ?? {};

  let label = String(it.name ?? '');

  if (it.deprecated) {
    label = `~${label}~`;
  }

  if (o.upper) {
    label = label.toUpperCase();
  }

  if (typeof o.max === 'number' && Number.isFinite(o.max) && label.length > o.max) {
    label = o.max <= 1 ? label.slice(0, o.max) : label.slice(0, o.max - 1) + '…';
  }

  return label;
}