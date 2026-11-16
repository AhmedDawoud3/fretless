import type { Marker } from "../../neck/OudNeck";
import type { DrillContext } from "../drill";
import { layered, noteMarker } from "../markers";
import type { FindResult } from "./check";
import type { FindQuestion } from "./question";

/** Nothing before the answer; after it every right place in teal and a wrong press in red. */
export function findMarkers(
  { neck, system }: DrillContext,
  question: FindQuestion,
  result: FindResult | null,
): Marker[] {
  if (!result) return [];
  const lit = question.targets.map((t) => noteMarker(neck, system, t, "active"));
  if (result.correct) return lit;
  return layered(lit, [noteMarker(neck, system, result.pressed, "root")]);
}
