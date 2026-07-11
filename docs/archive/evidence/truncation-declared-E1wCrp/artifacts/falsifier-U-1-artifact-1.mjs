// leaf.mjs — standalone marker-string parser
//
// House parsing convention (per note-thing-format / note-thing-edges):
//   parseThing("urgent!3") -> { level: "urgent", count: 3 }
//   - level is always lowercased in the result
//   - a missing "!count" suffix defaults count to 1
//   - a zero or negative count throws a RangeError
//   - an empty level throws a RangeError
//   - non-string input throws a TypeError

export function parseThing(str) {
  if (typeof str !== 'string') {
    throw new TypeError('parseThing: input must be a string');
  }

  const bangIndex = str.indexOf('!');
  const rawLevel = bangIndex === -1 ? str : str.slice(0, bangIndex);
  const rawCount = bangIndex === -1 ? null : str.slice(bangIndex + 1);

  const level = rawLevel.toLowerCase();
  if (level === '') {
    throw new RangeError('parseThing: level must not be empty');
  }

  let count;
  if (rawCount === null || rawCount === '') {
    count = 1;
  } else {
    count = Number(rawCount);
    if (!Number.isInteger(count)) {
      throw new RangeError('parseThing: count must be an integer');
    }
  }

  if (count <= 0) {
    throw new RangeError('parseThing: count must be a positive integer');
  }

  return { level, count };
}