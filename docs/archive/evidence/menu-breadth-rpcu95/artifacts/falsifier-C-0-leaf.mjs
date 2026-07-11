export function parseThing(str) {
  if (typeof str !== 'string') {
    throw new TypeError('parseThing expects a string');
  }

  const bangIndex = str.indexOf('!');
  const rawLevel = bangIndex === -1 ? str : str.slice(0, bangIndex);
  const rawCount = bangIndex === -1 ? null : str.slice(bangIndex + 1);

  const level = rawLevel.toLowerCase();
  if (level === '') {
    throw new RangeError('parseThing: level must not be empty');
  }

  let count = 1;
  if (rawCount !== null) {
    count = Number(rawCount);
    if (!Number.isFinite(count) || count <= 0) {
      throw new RangeError('parseThing: count must be a positive number');
    }
  }

  return { level, count };
}