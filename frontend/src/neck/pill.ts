export const PILL_HEIGHT = 20;
export const COMPACT_PILL_HEIGHT = 18;

const CHAR_WIDTH = 9;
const COMPACT_CHAR_WIDTH = 7;

/** Drawn width of a label pill; compact pills use smaller type so a crowded scale stays legible. */
export function pillWidth(label: string, compact = false): number {
  const length = [...label].length;
  return compact ? length * COMPACT_CHAR_WIDTH + 8 : length * CHAR_WIDTH + 12;
}
