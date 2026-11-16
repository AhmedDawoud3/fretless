import type { DrillContext } from "../drill";
import { nameOfPitch } from "../neckLookup";
import { spokenName } from "../spokenName";
import type { IntervalResult } from "./check";
import type { IntervalQuestion } from "./question";

/** The right answer in words, with the two notes that were played. */
export function describeInterval(
  { low, interval }: IntervalQuestion,
  _result: IntervalResult,
  { neck, system }: DrillContext,
): string {
  const named = (pitch: number) => {
    const name = nameOfPitch(neck, pitch);
    return name ? spokenName(name, system) : "?";
  };
  const notes = `${named(low)} up to ${named(low + interval.steps)}`;
  return `It was the ${interval.name.toLowerCase()} (${interval.frets}): ${notes}.`;
}
