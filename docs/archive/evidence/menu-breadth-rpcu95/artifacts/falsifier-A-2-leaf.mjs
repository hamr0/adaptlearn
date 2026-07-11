// leaf.mjs — standalone marker-string parser
export function parseThing(str) {
  if (typeof str !== 'string') {
    throw new TypeError('parseThing expects a string');
  }
  const bangIndex = str.indexOf('!');
  const rawLevel = bangIndex === -1 ? str : str.slice(0, bangIndex);
  const level = rawLevel.toLowerCase();
  if (level === '') {
    throw new RangeError('parseThing: level must be non-empty');
  }
  const count = bangIndex === -1 ? 1 : Number(str.slice(bangIndex + 1));
  if (!Number.isInteger(count) || count <= 0) {
    throw new RangeError('parseThing: count must be a positive integer');
  }
  return { level, count };
}