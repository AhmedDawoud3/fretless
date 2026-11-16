import { type Comparison, compareToTarget, nearestStep, type Reading } from "../../listen";
import { STEPS_PER_OCTAVE } from "../neckLookup";
import type { Sample } from "./hold";

/** What the microphone heard, against the target note. */
export type Heard =
  | { kind: "nothing" }
  /** A different note: the nearest step that sounded. */
  | { kind: "wrong"; step: number }
  /** The target, or the target in another octave: how far off, and how many octaves away. */
  | { kind: "tuned"; comparison: Comparison; octaves: number };

export function assess(reading: Reading, target: number): Heard {
  if (reading.state !== "steady") return { kind: "nothing" };
  const comparison = compareToTarget(reading.steps, target, { octaveTolerant: true });
  if (comparison.wrongNote) return { kind: "wrong", step: nearestStep(reading.steps).step };
  return {
    kind: "tuned",
    comparison,
    octaves: Math.round((reading.steps - target) / STEPS_PER_OCTAVE) || 0,
  };
}

/** What the hold state machine is fed: only the target, within the green zone, counts as in tune. */
export function sampleOf(heard: Heard): Sample {
  if (heard.kind === "nothing") return "nothing";
  return heard.kind === "tuned" && heard.comparison.verdict === "in_tune" ? "in_tune" : "off";
}
