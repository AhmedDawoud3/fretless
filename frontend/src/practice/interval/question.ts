import type { Interval } from "../../api/client";
import type { DrillContext } from "../drill";
import { pick } from "../random";
import { pickWeighted } from "../weighted";

/** Two notes: `low`, and `low` plus the interval. The options are every interval up to the level. */
export type IntervalQuestion = { low: number; interval: Interval; options: readonly Interval[] };

/** The start note lies between a quarter and a half of the way up the range of the oud. */
const BAND_START = 0.25;
const BAND_END = 0.5;

/** Even pitches (twelve-tone notes) in the middle of the range whose upper note is also on the neck. */
function startNotes(context: DrillContext, steps: number): number[] {
  const pitches = new Set(context.neck.locations.map((l) => l.pitch));
  const all = [...pitches];
  const lowest = Math.min(...all);
  const span = Math.max(...all) - lowest;
  return all.filter(
    (p) =>
      p % 2 === 0 &&
      p >= lowest + span * BAND_START &&
      p <= lowest + span * BAND_END &&
      pitches.has(p + steps),
  );
}

export function makeIntervalQuestion(
  context: DrillContext,
  random: () => number,
): IntervalQuestion {
  const options = context.intervals
    .filter((i) => i.level <= context.level)
    .sort((a, b) => a.steps - b.steps);
  const id = pickWeighted(
    options.map((o) => o.id),
    context.stats,
    random,
  );
  const interval = pick(
    options.filter((o) => o.id === id),
    random,
  );
  return { low: pick(startNotes(context, interval.steps), random), interval, options };
}

export const intervalItemKey = (q: IntervalQuestion): string => q.interval.id;
