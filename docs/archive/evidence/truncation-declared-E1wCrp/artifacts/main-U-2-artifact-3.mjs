// format.mjs — shared label formatter
//
// formatLabel(item, opts) builds a display label from an item's fields plus
// caller options. Every decoration is additive: callers pass only the fields
// they care about, and each present field contributes its own piece of the
// label. This keeps a single formatter usable across every calling module.

export function formatLabel(item = {}, opts = {}) {
  const it = item ?? {};
  const options = opts ?? {};

  let label = String(it.name ?? '');

  // Structural markup — markdown-style, no surrounding spaces.
  if (it.deprecated) label = `~~${label}~~`;
  if (it.id != null) label = `${label}#${it.id}`;

  // Display annotations — space-separated so they read as trailing badges.
  if (Array.isArray(it.tags) && it.tags.length) {
    label = `${label} [${it.tags.join(', ')}]`;
  }
  if (it.qty != null) label = `${label} ×${it.qty}`;
  if (it.cents != null) {
    label = `${label} — $${(it.cents / 100).toFixed(2)}`;
  }

  // Caller options applied last, over the fully composed label.
  if (options.max != null && label.length > options.max) {
    label = `${label.slice(0, options.max)}…`;
  }
  if (options.upper) label = label.toUpperCase();

  return label;
}