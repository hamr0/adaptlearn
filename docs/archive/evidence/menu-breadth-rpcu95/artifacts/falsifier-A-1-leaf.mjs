// leaf.mjs — standalone marker-string parser
export function parseThing(str) {
  if (typeof str !== 'string') {
    throw new TypeError('parseThing: input must be a string');
  }

  const bang = str.indexOf('!');
  const rawLevel = bang === -1 ? str : str.slice(0, bang);
  const rawCount = bang === -1 ? null : str.slice(bang + 1);

  const level = rawLevel.toLowerCase();
  if (level === '') {
    throw new RangeError('parseThing: level must be non-empty');
  }

  let count = 1;
  if (rawCount !== null) {
    count = Number(rawCount);
    if (!Number.isInteger(count) || count <= 0) {
      throw new RangeError('parseThing: count must be a positive integer');
    }
  }

  return { level, count };
}