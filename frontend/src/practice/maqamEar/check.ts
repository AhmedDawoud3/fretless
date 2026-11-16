import type { DrillResult } from "../drill";
import type { MaqamQuestion } from "./question";

export type MaqamResult = DrillResult & { chosen: string };

/** The answer is the id of the maqam the user chose. */
export function checkMaqam(question: MaqamQuestion, chosen: string): MaqamResult {
  return { correct: chosen === question.maqam.id, chosen };
}
