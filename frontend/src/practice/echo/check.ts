import type { DrillResult } from "../drill";
import type { EchoQuestion } from "./question";

/** The final answer: the pitch found (null when the user gave up) and how many presses it took. */
export type EchoAnswer = { pitch: number | null; tries: number };
/** `correct` counts first-try hits only; `found` is whether the target was ever found. */
export type EchoResult = DrillResult & { found: boolean; tries: number };

export type Hint = "higher" | "lower" | "that's it";

/** Where the target lies from a pressed note. */
export function hintFor(question: EchoQuestion, pressed: number): Hint {
  if (pressed === question.target) return "that's it";
  return pressed < question.target ? "higher" : "lower";
}

export function checkEcho(question: EchoQuestion, { pitch, tries }: EchoAnswer): EchoResult {
  const found = pitch === question.target;
  return { correct: found && tries === 1, found, tries };
}
