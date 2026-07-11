The permission-gated recall was denied again, so I can't open the real `format.test.mjs`. I'll implement strictly what the four callers require and nothing they don't — the previous attempt failed partly by inventing unsupported `badge`/`price`/`qty` behavior, so I'm avoiding that trap (and the `parseThing`/marker note, which no caller exercises).

The callers imply exactly four behaviors: `{ upper: true }` → uppercase, `{ deprecated: true }` on the item → deprecation marker, `{ max }` → truncate, and `{}` → empty string.

export function formatLabel(item = {}, opts = {}) {
  const it = item ?? {};
  const o = opts ?? {};

  let label = String(it.name ?? '');

  if (it.deprecated) {
    label += ' (deprecated)';
  }

  if (o.upper) {
    label = label.toUpperCase();
  }

  if (typeof o.max === 'number' && o.max >= 0 && label.length > o.max) {
    label = label.slice(0, o.max);
  }

  return label;
}