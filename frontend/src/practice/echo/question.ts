import type { DrillContext } from "../drill";
import { pitchClass } from "../neckLookup";
import { pick } from "../random";
import { pickWeighted } from "../weighted";

/** An open course sounds, then a hidden note above it: both are pitches in steps. */
export type EchoQuestion = { reference: number; target: number };

type Rules = { reach: number; alters: readonly number[] | "any" };

/** Level 1: natural notes within a fifth. 2: any twelve-tone note within an octave. 3: quarter tones too. */
const RULES: Readonly<Record<number, Rules>> = {
  1: { reach: 14, alters: [0] },
  2: { reach: 24, alters: [0, 2, -2] },
  3: { reach: 24, alters: "any" },
};
const FALLBACK_RULES = RULES[1] as Rules;

export function makeEchoQuestion(context: DrillContext, random: () => number): EchoQuestion {
  const rules = RULES[context.level] ?? FALLBACK_RULES;
  const reference = pick(context.neck.courses, random).open_pitch;
  const found = context.neck.locations.filter(
    (l) =>
      l.pitch > reference &&
      l.pitch <= reference + rules.reach &&
      (rules.alters === "any" || rules.alters.includes(l.name.alter)),
  );
  const pitches = [...new Set(found.map((l) => l.pitch))];
  const key = pickWeighted(
    [...new Set(pitches.map((p) => String(pitchClass(p))))],
    context.stats,
    random,
  );
  return {
    reference,
    target: pick(
      pitches.filter((p) => String(pitchClass(p)) === key),
      random,
    ),
  };
}

export const echoItemKey = (q: EchoQuestion): string => String(pitchClass(q.target));
