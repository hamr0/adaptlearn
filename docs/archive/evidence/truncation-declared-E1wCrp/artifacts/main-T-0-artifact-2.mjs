// format.mjs — shared label formatter
export function formatLabel(item = {}, opts = {}) {
  const it = item ?? {};
  const o = opts ?? {};

  let label = String(it.name ?? '');

  // qty: multiplication-sign (×) suffix — form is a GUESS (test output was truncated)
  if (it.qty != null) label += ` \u00D7${it.qty}`;

  // badge: tags comma-joined in brackets -> "Cache [fast,io]"
  if (Array.isArray(it.tags) && it.tags.length > 0) label += ` [${it.tags.join(',')}]`;

  // price: em-dash + dollars from integer cents -> "Widget — $1.50"
  if (it.cents != null) label += ` \u2014 $${(Number(it.cents) / 100).toFixed(2)}`;

  // caller opts (from stale recall, UNVERIFIED — semantics/marker text are guesses)
  if (o.max != null && label.length > o.max) label = label.slice(0, o.max);
  if (o.deprecated) label = `${label} (deprecated)`;
  if (o.upper) label = label.toUpperCase();

  return label;
}