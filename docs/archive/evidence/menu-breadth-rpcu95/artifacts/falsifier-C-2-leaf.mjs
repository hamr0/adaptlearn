// leaf.mjs — standalone marker-string parser
export function parseThing(str) {
  if (typeof str !== 'string') {
    throw new TypeError('parseThing expects a string');
  }

  const bang = str.indexOf('!');
  const rawLevel = bang === -1 ? str : str.slice(0, bang);

  if (rawLevel === '') {
    throw new RangeError('level must not be empty');
  }

  let count = 1;
  if (bang !== -1) {
    count = Number(str.slice(bang + 1));
    if (!Number.isInteger(count) || count <= 0) {
      throw new RangeError('count must be a positive integer');
    }
  }

  return { level: rawLevel.toLowerCase(), count };
}