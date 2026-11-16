import type { DrillContext } from "../drill";
import { lowestLocation, pitchClass } from "../neckLookup";
import { pick } from "../random";
import { pickWeighted } from "../weighted";

/** A note to play, and the place on the oud that is marked for it. */
export type MicQuestion = { pitch: number; course: number; position: number };

/** Positions up to this are first position: four guitar frets from the nut. */
const FIRST_POSITION = 8;

type Rules = { maxPosition: number; alters: readonly number[] };

/** 1: open courses (a tuning check). 2: natural notes. 3: sharps and flats. 4: half-flats and half-sharps. */
const RULES: Readonly<Record<number, Rules>> = {
  1: { maxPosition: 0, alters: [0, 1, -1, 2, -2] },
  2: { maxPosition: FIRST_POSITION, alters: [0] },
  3: { maxPosition: FIRST_POSITION, alters: [2, -2] },
  4: { maxPosition: FIRST_POSITION, alters: [1, -1] },
};
const FALLBACK_RULES = RULES[1] as Rules;

export function makeMicQuestion(context: DrillContext, random: () => number): MicQuestion {
  const rules = RULES[context.level] ?? FALLBACK_RULES;
  const found = context.neck.locations.filter(
    (l) => l.position <= rules.maxPosition && rules.alters.includes(l.name.alter),
  );
  const pitches = [...new Set(found.map((l) => l.pitch))];
  const key = pickWeighted(
    [...new Set(pitches.map((p) => String(pitchClass(p))))],
    context.stats,
    random,
  );
  const pitch = pick(
    pitches.filter((p) => String(pitchClass(p)) === key),
    random,
  );
  const spot = lowestLocation(context.neck, pitch);
  if (!spot) throw new RangeError("a pitch taken from the neck is not on it");
  return { pitch, course: spot.course, position: spot.position };
}

export const micItemKey = (q: MicQuestion): string => String(pitchClass(q.pitch));
