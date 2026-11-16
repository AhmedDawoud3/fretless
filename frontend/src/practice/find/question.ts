import type { NeckLocation, NoteName } from "../../api/client";
import type { DrillContext } from "../drill";
import { pitchClass } from "../neckLookup";
import { pick } from "../random";
import { pickWeighted } from "../weighted";

export type Spot = { course: number; position: number };

/** Find a note: its name, the course it must be on (or any), and every right place for it. */
export type FindQuestion = {
  pitchClass: number;
  name: NoteName;
  course: number | null;
  targets: readonly Spot[];
};

type Rules = { alters: readonly number[] | "any"; maxPosition: number; namesCourse: boolean };

/** Level 1: natural notes in first position. 2: sharps and flats, a named course. 3: quarter tones, the whole neck. */
const RULES: Readonly<Record<number, Rules>> = {
  1: { alters: [0], maxPosition: 10, namesCourse: false },
  2: { alters: [0, 2, -2], maxPosition: 10, namesCourse: true },
  3: { alters: "any", maxPosition: Number.POSITIVE_INFINITY, namesCourse: true },
};

const allowed = (rules: Rules, l: NeckLocation) =>
  l.position <= rules.maxPosition &&
  (rules.alters === "any" || rules.alters.includes(l.name.alter));

const FALLBACK_RULES = RULES[1] as Rules;

/** Picks a note the user knows least among those the level allows, then one place it can be asked from. */
export function makeFindQuestion(context: DrillContext, random: () => number): FindQuestion {
  const rules = RULES[context.level] ?? FALLBACK_RULES;
  const candidates = context.neck.locations.filter((l) => allowed(rules, l));
  const keys = [...new Set(candidates.map((l) => String(pitchClass(l.pitch))))];
  const key = pickWeighted(keys, context.stats, random);
  const chosen = pick(
    candidates.filter((l) => String(pitchClass(l.pitch)) === key),
    random,
  );
  const course = rules.namesCourse ? chosen.course : null;
  const targets = context.neck.locations
    .filter((l) => pitchClass(l.pitch) === pitchClass(chosen.pitch))
    .filter((l) => course === null || l.course === course)
    .map(({ course: c, position }) => ({ course: c, position }));
  return { pitchClass: pitchClass(chosen.pitch), name: chosen.name, course, targets };
}

export const findItemKey = (q: FindQuestion): string => String(q.pitchClass);
