import { compareToTarget, nearestStep, type Reading } from "../../listen";

/** The nearest note heard (a pitch in steps) and how many cents the sound is from it; null if nothing steady. */
export function tunerReading(reading: Reading): { step: number; cents: number } | null {
  return reading.state === "steady" ? nearestStep(reading.steps) : null;
}

/** The courses whose open note is what is heard now, within the green zone. Octaves do not match. */
export function matchedCourses(
  reading: Reading,
  courses: readonly { course: number; open_pitch: number }[],
): number[] {
  if (reading.state !== "steady") return [];
  const { steps } = reading;
  return courses
    .filter((c) => compareToTarget(steps, c.open_pitch).verdict === "in_tune")
    .map((c) => c.course);
}
