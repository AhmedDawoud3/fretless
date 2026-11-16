import type { Play } from "../../neck/play";
import type { DrillResult } from "../drill";
import { pitchClass } from "../neckLookup";
import type { FindQuestion } from "./question";

export type FindResult = DrillResult & { pressed: Play };

/** Right when the pressed note is the asked note in any octave, on the named course if there is one. */
export function checkFind(question: FindQuestion, pressed: Play): FindResult {
  const noteMatches = pitchClass(pressed.pitch) === question.pitchClass;
  const courseMatches = question.course === null || pressed.course === question.course;
  return { correct: noteMatches && courseMatches, pressed };
}
