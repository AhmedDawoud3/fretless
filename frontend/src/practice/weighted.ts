import type { Tally } from "./progress";

const UNSEEN_WEIGHT = 4;
const WRONG_WEIGHT = 3;

/** Unseen counts most; then the less often it was right the more; a mastered item still has weight 1. */
export function weightOf(tally: Tally | undefined): number {
  if (!tally || tally.attempts === 0) return UNSEEN_WEIGHT;
  return 1 + WRONG_WEIGHT * (1 - tally.correct / tally.attempts);
}

/** One of `items` (keys), more likely the less the user knows it. */
export function pickWeighted(
  items: readonly string[],
  stats: Readonly<Record<string, Tally>>,
  random: () => number,
): string {
  const weights = items.map((item) => weightOf(stats[item]));
  let left = random() * weights.reduce((sum, w) => sum + w, 0);
  for (const [i, item] of items.entries()) {
    left -= weights[i] ?? 0;
    if (left < 0) return item;
  }
  const last = items.at(-1);
  if (last === undefined) throw new RangeError("nothing to pick from");
  return last;
}
