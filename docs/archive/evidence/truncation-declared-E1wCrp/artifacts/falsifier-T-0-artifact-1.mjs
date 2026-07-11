// leaf.mjs — standalone marker-string parser
export function parseThing(str) {
  if (typeof str !== 'string') {
    throw new TypeError('parseThing expects a string');
  }

  const bangIndex = str.indexOf('!');
  const level = (bangIndex === -1 ? str : str.slice(0, bangIndex)).toLowerCase();
  const countStr = bangIndex === -1 ? '' : str.slice(bangIndex + 1);

  if (level === '') {
    throw new RangeError('parseThing requires a non-empty level');
  }

  const count = countStr === '' ? 1 : Number(countStr);
  if (!Number.isInteger(count) || count <= 0) {
    throw new RangeError('parseThing count must be a positive integer');
  }

  return { level, count };
}