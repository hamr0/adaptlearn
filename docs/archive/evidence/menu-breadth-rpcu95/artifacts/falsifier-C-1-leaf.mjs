// leaf.mjs — standalone marker-string parser
export function parseThing(str) {
  if (typeof str !== 'string') {
    throw new TypeError('parseThing expects a string');
  }
  const bang = str.indexOf('!');
  const level = (bang === -1 ? str : str.slice(0, bang)).toLowerCase();
  if (level === '') {
    throw new RangeError('level must be a non-empty word');
  }
  let count = 1;
  if (bang !== -1) {
    count = Number(str.slice(bang + 1));
    if (!Number.isInteger(count) || count <= 0) {
      throw new RangeError('count must be a positive integer');
    }
  }
  return { level, count };
}