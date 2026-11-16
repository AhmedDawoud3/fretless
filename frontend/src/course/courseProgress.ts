import type { Lesson, LessonStep } from "../api/client";
import type { Marker } from "../neck/OudNeck";

type Spot = { course: number; position: number };

/** True when the note played on the neck matches the lesson step's target pitch. */
export function isStepHit(
  step: LessonStep,
  hit: { course: number; position: number; pitch: number },
): boolean {
  return step.pitch === hit.pitch;
}

/** Add `lessonId` to the completed set without duplicates or mutating `completed`. */
export function completeLesson(completed: readonly string[], lessonId: string): string[] {
  return completed.includes(lessonId) ? [...completed] : [...completed, lessonId];
}

/** Pick the first uncompleted lesson id, falling back to the first lesson when all are done. */
export function firstPendingLesson(
  lessons: readonly Lesson[],
  completed: readonly string[],
): string | null {
  return lessons.find((l) => !completed.includes(l.id))?.id ?? lessons[0]?.id ?? null;
}

function sameSpot(a: Spot | undefined, b: Spot): boolean {
  return a?.course === b.course && a.position === b.position;
}

function toMarker(step: LessonStep, target: Spot | undefined): Marker {
  return {
    course: step.course,
    position: step.position,
    label: step.label,
    tone: sameSpot(target, step) ? "active" : "normal",
  };
}

/** Neck markers for a lesson: unique locations, highlighting `playbackLocation` or the current step. */
export function lessonMarkers(
  lesson: Lesson,
  stepIndex: number,
  playbackLocation: Spot | null,
): Marker[] {
  const target = playbackLocation ?? lesson.steps[stepIndex];
  const bySpot = new Map<string, Marker>();
  for (const step of lesson.steps) {
    const key = `${step.course}-${step.position}`;
    const marker = toMarker(step, target);
    if (!bySpot.has(key) || marker.tone === "active") {
      bySpot.set(key, marker);
    }
  }
  return [...bySpot.values()];
}
