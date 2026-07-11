// format.mjs — shared label formatter
//
// formatLabel(item, opts) assembles a display label from an item's fields,
// then applies opts-level transforms (truncation, uppercasing). Every branch
// below encodes a house rule exercised by the shared caller test suite.

export function formatLabel(item = {}, opts = {}) {
  // Base: the name, or the placeholder when it's missing/empty.
  let label =
    item.name != null && String(item.name).length > 0
      ? String(item.name)
      : '(unnamed)';

  // id → hash suffix: 'Node' + { id: 42 } → 'Node#42'
  if (item.id != null) {
    label += `#${item.id}`;
  }

  // qty → multiplication-sign suffix: 'Bolt' + { qty: 3 } → 'Bolt ×3'
  if (item.qty != null) {
    label += ` ×${item.qty}`;
  }

  // tags → comma-joined in square brackets: 'Cache' + ['fast','io'] → 'Cache [fast,io]'
  if (Array.isArray(item.tags) && item.tags.length > 0) {
    label += ` [${item.tags.join(',')}]`;
  }

  // cents → dollars with two decimals after an em dash: 150 → ' — $1.50'
  if (item.cents != null) {
    label += ` — $${(item.cents / 100).toFixed(2)}`;
  }

  // deprecated → wrapped in double tildes: 'OldApi' → '~~OldApi~~'
  if (item.deprecated) {
    label = `~~${label}~~`;
  }

  // opts.max → truncate to max chars *including* the trailing ellipsis:
  // 'Extraordinarily' with max 8 → 'Extraor…'
  if (opts && opts.max != null && label.length > opts.max) {
    label = label.slice(0, Math.max(0, opts.max - 1)) + '…';
  }

  // opts.upper → uppercase the whole label: 'Alert' → 'ALERT'
  if (opts && opts.upper) {
    label = label.toUpperCase();
  }

  return label;
}