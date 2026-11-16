import type { DrillContext } from "../drill";
import { nameOfPitchClass } from "../neckLookup";
import { spokenName } from "../spokenName";
import type { MicResult } from "./check";
import type { MicQuestion } from "./question";

function centsWords(cents: number): string {
  const rounded = Math.round(Math.abs(cents));
  if (rounded === 0) return "spot on";
  return `${rounded} cents ${cents > 0 ? "sharp" : "flat"}`;
}

function octaveWords(octaves: number): string {
  if (octaves === 0) return "";
  const count = Math.abs(octaves);
  return `, ${count === 1 ? "an octave" : `${count} octaves`} ${octaves > 0 ? "higher" : "lower"}`;
}

const triesWords = (tries: number) => (tries === 1 ? "first try" : `after ${tries} tries`);

/** The note that was asked for, how in tune it was held, and how many tries it took. */
export function describePlay(
  { pitch }: MicQuestion,
  { cents, tries, octaves }: MicResult,
  { neck, system }: DrillContext,
): string {
  const name = nameOfPitchClass(neck, pitch);
  const note = name ? spokenName(name, system) : "the note";
  return `You played ${note}: ${centsWords(cents)}${octaveWords(octaves)}, ${triesWords(tries)}.`;
}
