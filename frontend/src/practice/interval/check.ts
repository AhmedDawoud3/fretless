import type { DrillResult } from "../drill";
import type { IntervalQuestion } from "./question";

export type IntervalResult = DrillResult & { chosen: string };

/** The answer is the id of the interval the user chose. */
export function checkInterval(question: IntervalQuestion, chosen: string): IntervalResult {
  return { correct: chosen === question.interval.id, chosen };
}
