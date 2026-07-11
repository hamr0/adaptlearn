// leaf.mjs — standalone marker-string parser
// Format: "<level>" or "<level>!<count>", e.g. "urgent!3" -> { level: "urgent", count: 3 }

export function parseThing(str) {
  if (typeof str !== 'string') {
    throw new TypeError('parseThing expects a string');
  }

  const bang = str.indexOf('!');
  const level = (bang === -1 ? str : str.slice(0, bang)).toLowerCase();

  if (level === '') {
    throw new RangeError('parseThing requires a non-empty level');
  }

  let count = 1;
  if (bang !== -1) {
    count = Number(str.slice(bang + 1));
    if (!Number.isInteger(count) || count <= 0) {
      throw new RangeError('parseThing count must be a positive integer');
    }
  }

  return { level, count };
}