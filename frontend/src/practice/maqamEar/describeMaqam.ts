import type { DrillContext } from "../drill";
import { nameOfPitchClass } from "../neckLookup";
import { spokenName } from "../spokenName";
import type { MaqamResult } from "./check";
import type { MaqamQuestion } from "./question";

/** The right maqam and its root, then the API's description of how it sounds. */
export function describeMaqam(
  { maqam, root }: MaqamQuestion,
  _result: MaqamResult,
  { neck, system }: DrillContext,
): string {
  const name = nameOfPitchClass(neck, root);
  const on = name ? ` on ${spokenName(name, system)}` : "";
  return `It was ${maqam.name}${on}. ${maqam.description}`;
}
