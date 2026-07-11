export function parseThing(str) {
  if (typeof str !== 'string') {
    throw new TypeError('parseThing expects a string');
  }

  const sep = str.indexOf('!');
  const rawLevel = sep === -1 ? str : str.slice(0, sep);
  const rawCount = sep === -1 ? undefined : str.slice(sep + 1);

  const level = rawLevel.toLowerCase();
  if (level === '') {
    throw new RangeError('level must not be empty');
  }

  let count = 1;
  if (rawCount !== undefined) {
    count = Number(rawCount);
  }

  if (!Number.isFinite(count) || count <= 0) {
    throw new RangeError('count must be a positive number');
  }

  return { level, count };
}