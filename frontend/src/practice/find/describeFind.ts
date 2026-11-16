import type { DrillContext } from "../drill";
import { nameOfPitch } from "../neckLookup";
import { spokenName } from "../spokenName";
import type { FindResult } from "./check";
import type { FindQuestion } from "./question";

const onCourse = (course: number | null) => (course === null ? "" : ` on course ${course}`);

/** The right answer in words; when wrong, also what was pressed. */
export function describeFind(
  question: FindQuestion,
  result: FindResult,
  { neck, system }: DrillContext,
): string {
  const asked = `${spokenName(question.name, system)}${onCourse(question.course)}`;
  if (result.correct) return `That is ${asked}.`;
  const name = nameOfPitch(neck, result.pressed.pitch);
  const pressed = name ? spokenName(name, system) : "another note";
  return `You pressed ${pressed} on course ${result.pressed.course}. ${asked} is lit on the neck.`;
}
