import type { NeckOut } from "../api/client";
import { type Hit, snapPosition } from "./geometry";

export type Play = { course: number; position: number; pitch: number };

/** Turns a pointer hit into what gets played: snapped to a step, or the exact fractional spot. */
export function toPlay(neck: NeckOut, hit: Hit, snap: boolean): Play {
  const position = snap ? snapPosition(neck.courses, hit.course, hit.position) : hit.position;
  const open = neck.courses.find((c) => c.course === hit.course)?.open_pitch ?? 0;
  return { course: hit.course, position, pitch: open + position };
}
