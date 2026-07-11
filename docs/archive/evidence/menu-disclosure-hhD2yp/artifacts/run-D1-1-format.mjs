// format.mjs — shared label formatter

export function parseThing(marker) {
  const m = String(marker).trim().match(/^([^!]+)(?:!(\d+))?$/);
  if (!m) return { level: String(marker).toLowerCase(), count: 1 };
  return { level: m[1].toLowerCase(), count: m[2] ? Number(m[2]) : 1 };
}

export function formatLabel(item, opts = {}) {
  const raw = typeof item === "string" ? item : (item?.marker ?? item?.label ?? "");
  const { level, count } = parseThing(raw);
  const name = opts.uppercase ? level.toUpperCase() : level;
  return count > 1 ? `${name} (${count})` : name;
}