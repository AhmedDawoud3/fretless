import type { DrillContext } from "../drill";
import { nameOfPitch } from "../neckLookup";
import { spokenName } from "../spokenName";
import type { EchoResult } from "./check";
import type { EchoQuestion } from "./question";

/** The note in words, and how it went. */
export function describeEcho(
  question: EchoQuestion,
  result: EchoResult,
  { neck, system }: DrillContext,
): string {
  const name = nameOfPitch(neck, question.target);
  const note = name ? spokenName(name, system) : "the note";
  if (!result.found) return `It was ${note}. It is lit on the neck now.`;
  if (result.tries === 1) return `You found ${note} on the first try.`;
  return `You found ${note} in ${result.tries} tries.`;
}
