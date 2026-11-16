import type { Marker } from "../../neck/OudNeck";
import type { Play } from "../../neck/play";
import type { DrillContext } from "../drill";
import { layered, noteMarker } from "../markers";
import type { EchoResult } from "./check";
import type { EchoQuestion } from "./question";

/** The open reference course in red, the last press plain, and once answered every place of the target in teal. */
export function echoMarkers(
  { neck, system }: DrillContext,
  question: EchoQuestion,
  last: Play | null,
  result: EchoResult | null,
): Marker[] {
  const reference = neck.courses.find((c) => c.open_pitch === question.reference);
  const base = reference
    ? [noteMarker(neck, system, { course: reference.course, position: 0 }, "root")]
    : [];
  const pressed = last ? [noteMarker(neck, system, last, "normal")] : [];
  const lit = result
    ? neck.locations
        .filter((l) => l.pitch === question.target)
        .map((l) => noteMarker(neck, system, l, "active"))
    : [];
  return layered(base, pressed, lit);
}
