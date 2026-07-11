// leaf.mjs — standalone marker-string parser
export function parseThing(str) {
  if (typeof str !== 'string') {
    throw new TypeError('parseThing expects a string');
  }

  const bang = str.indexOf('!');
  const rawLevel = bang === -1 ? str : str.slice(0, bang);
  const rawCount = bang === -1 ? '' : str.slice(bang + 1);

  const level = rawLevel.toLowerCase();
  if (level === '') {
    throw new RangeError('parseThing requires a non-empty level');
  }

  const count = rawCount === '' ? 1 : Number(rawCount);
  if (!Number.isFinite(count) || count <= 0) {
    throw new RangeError('parseThing requires a positive count');
  }

  return { level, count };
}