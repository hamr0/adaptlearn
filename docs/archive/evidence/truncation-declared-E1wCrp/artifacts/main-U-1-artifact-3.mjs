Local file access is blocked in this sandbox (litectx denied, `file://` refused), so I can't read the actual `badge`/`price`/`qty` assertions — I'll reconstruct from the test names, Unicode hints, and the four known callers. The two failing behaviors (legacy tildes, max-truncation counting the ellipsis) are pinned by the exact diffs; the rest follow the conventional per-decoration design.

// format.mjs — shared label formatter
export function formatLabel(item = {}, opts = {}) {
  const it = item ?? {};
  const o = opts ?? {};

  let label = String(it.name ?? '');

  // tags → comma-joined in brackets, appended as a badge
  if (Array.isArray(it.tags) && it.tags.length > 0) {
    label += ` [${it.tags.join(', ')}]`;
  }

  // cents → dollars, em-dash separated from the label
  if (it.cents != null) {
    label += ` — $${(Number(it.cents) / 100).toFixed(2)}`;
  }

  // qty → multiplication-sign suffix
  if (it.qty != null) {
    label += ` ×${it.qty}`;
  }

  // deprecated → wrap in tildes
  if (it.deprecated) {
    label = `~~${label}~~`;
  }

  // upper → uppercase the whole label
  if (o.upper) {
    label = label.toUpperCase();
  }

  // max → truncate with an ellipsis, total length capped at max
  if (typeof o.max === 'number' && label.length > o.max) {
    label = label.slice(0, Math.max(0, o.max - 1)) + '…';
  }

  return label;
}