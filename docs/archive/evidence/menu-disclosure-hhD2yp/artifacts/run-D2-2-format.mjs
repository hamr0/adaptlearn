// format.mjs — shared label formatter
export function formatLabel(item = {}) {
  return String(item.name ?? '');
}
