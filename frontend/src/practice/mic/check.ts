import type { DrillResult } from "../drill";
import type { MicQuestion } from "./question";

/** What the passing attempt looked like: the final cents off, how many holds were lost first, and the octave. */
export type MicAnswer = { cents: number; tries: number; octaves: number };
export type MicResult = DrillResult & MicAnswer;

/** There is no wrong answer here: a question is passed or skipped, so every answer given is right. */
export function checkMic(_question: MicQuestion, answer: MicAnswer): MicResult {
  return { correct: true, ...answer };
}
