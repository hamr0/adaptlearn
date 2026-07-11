// format.mjs — shared label formatter
export function formatLabel(item = {}, opts = {}) {
  const {
    prefix = '',
    suffix = '',
    fallback = '',
    maxLength,
    ellipsis = '…',
    transform, // 'upper' | 'lower' | fn
    separator = ' ',
  } = opts;

  const raw =
    item == null ? '' :
    typeof item === 'string' ? item :
    (item.label ?? item.name ?? item.title ?? item.text ?? item.id ?? '');

  let text = String(raw);
  if (text === '') text = String(fallback);

  if (typeof transform === 'function') text = transform(text);
  else if (transform === 'upper') text = text.toUpperCase();
  else if (transform === 'lower') text = text.toLowerCase();

  text = [prefix, text, suffix].filter(s => s !== '' && s != null).join(separator);

  if (typeof maxLength === 'number' && text.length > maxLength) {
    text = text.slice(0, Math.max(0, maxLength - ellipsis.length)) + ellipsis;
  }

  return text;
}