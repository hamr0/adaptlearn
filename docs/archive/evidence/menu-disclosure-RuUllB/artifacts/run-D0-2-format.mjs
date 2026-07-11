// format.mjs — shared label formatter used by the modules in ./callers/.
//
// The label is built from an item's fields, then optionally transformed by opts.
// Each caller exercises one rule; the rules compose in a fixed order:
//   { name }             -> the name, or '(unnamed)' when missing/empty
//   { id }               -> `${name}#id`            (e.g. 'Node#42')
//   { qty }              -> `${name} ×qty`          (e.g. 'Bolt ×3')
//   { tags: [...] }      -> `${name} [a,b]`         (e.g. 'Cache [fast,io]')
//   { cents }            -> `${name} — $D.DD`       (e.g. 'Widget — $1.50')
//   { deprecated: true } -> `~~${label}~~`          (e.g. '~~OldApi~~')
//   opts.upper           -> uppercases the whole label
//   opts.max             -> truncates to max chars, trailing '…' INCLUDED

const EM_DASH = '\u2014';  // —
const TIMES = '\u00d7';    // ×
const ELLIPSIS = '\u2026'; // …

export function formatLabel(item, opts) {
  const it = item ?? {};
  const options = opts ?? {};

  const rawName = it.name;
  let label =
    rawName === undefined || rawName === null || rawName === ''
      ? '(unnamed)'
      : String(rawName);

  // id: hash suffix, attached with no space
  if (it.id !== undefined && it.id !== null) {
    label += `#${it.id}`;
  }

  // qty: multiplication-sign suffix
  if (it.qty !== undefined && it.qty !== null) {
    label += ` ${TIMES}${it.qty}`;
  }

  // tags: comma-joined inside square brackets
  if (Array.isArray(it.tags) && it.tags.length > 0) {
    label += ` [${it.tags.join(',')}]`;
  }

  // cents: integer cents rendered as dollars after an em dash
  if (it.cents !== undefined && it.cents !== null) {
    label += ` ${EM_DASH} $${(Number(it.cents) / 100).toFixed(2)}`;
  }

  // deprecated: wrap the whole label in double tildes
  if (it.deprecated) {
    label = `~~${label}~~`;
  }

  // opts.upper: uppercase the whole label
  if (options.upper) {
    label = label.toUpperCase();
  }

  // opts.max: truncate to max chars, counting the trailing ellipsis
  if (options.max !== undefined && options.max !== null && label.length > options.max) {
    const keep = Math.max(0, options.max - 1);
    label = label.slice(0, keep) + ELLIPSIS;
  }

  return label;
}

export default formatLabel;