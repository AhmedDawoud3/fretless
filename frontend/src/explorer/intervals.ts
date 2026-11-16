import type { Interval } from "../api/client";

/** A maqam's gaps in guitar-fret wording, as the API words them; a gap it has no name for is left out. */
export function describeGaps(gaps: readonly number[], intervals: readonly Interval[]): string {
  return gaps.flatMap((steps) => intervals.find((i) => i.steps === steps)?.frets ?? []).join(", ");
}
