// format.mjs — shared label formatter
//
// formatLabel(item, opts) composes a display label from an item's fields plus
// caller options. Each concern is independent; callers (see callers/*.mjs)
// generally exercise one at a time.

export function formatLabel(item = {}, opts = {}) {
  let label = String(item?.name ?? '');

  // qty → multiplication-sign suffix:  {name:'Widget', qty:3} → "Widget ×3"
  if (item?.qty != null) label += ` ×${item.qty}`;

  // cents → em-dash dollars:           {name:'Item', cents:1234} → "Item — $12.34"
  if (item?.cents != null) label += ` — $${(Number(item.cents) / 100).toFixed(2)}`;

  // tags → comma-joined in brackets:   {tags:['a','b']} → "Post [a,b]"
  if (Array.isArray(item?.tags) && item.tags.length) label += ` [${item.tags.join(',')}]`;

  // id → hash-keyed suffix:            {id:7} → "Row #7"
  if (item?.id != null) label += ` #${item.id}`;

  // deprecated → wrap in tildes:       {deprecated:true} → "~~OldApi~~"
  if (item?.deprecated) label = `~~${label}~~`;

  // max → truncate with single-char ellipsis; result length === max
  if (opts?.max != null && label.length > opts.max) {
    label = label.slice(0, Math.max(0, opts.max - 1)) + '…';
  }

  // upper → uppercase the whole label: opts.upper → "HI"
  if (opts?.upper) label = label.toUpperCase();

  return label;
}