import type { Maqam } from "../../api/client";
import type { DrillContext } from "../drill";
import { pick } from "../random";
import { pickWeighted } from "../weighted";
import { MAQAM_LEVELS } from "./maqamLevels";

/** A maqam to hear, the root it is played on (a pitch class, 0 to 23), and the maqamat to choose from. */
export type MaqamQuestion = { maqam: Maqam; root: number; options: readonly Maqam[] };

/** The twelve-tone pitch classes: the even ones, C = 0 ... B = 22. */
const TWELVE_TONE_ROOTS = Array.from({ length: 12 }, (_, i) => i * 2);
/** From this level the root is random, so it is no clue. */
const RANDOM_ROOT_LEVEL = 3;

export function makeMaqamQuestion(context: DrillContext, random: () => number): MaqamQuestion {
  const ids = MAQAM_LEVELS[context.level] ?? MAQAM_LEVELS[1] ?? [];
  const options = context.maqamat.filter((m) => ids.includes(m.id));
  const id = pickWeighted(
    options.map((m) => m.id),
    context.stats,
    random,
  );
  const maqam = pick(
    options.filter((m) => m.id === id),
    random,
  );
  const root =
    context.level >= RANDOM_ROOT_LEVEL ? pick(TWELVE_TONE_ROOTS, random) : maqam.default_root;
  return { maqam, root, options };
}

export const maqamItemKey = (q: MaqamQuestion): string => q.maqam.id;
