import { expect, test } from "vitest";
import type { Lesson } from "../api/client";
import { completeLesson, firstPendingLesson, isStepHit, lessonMarkers } from "./courseProgress";

const lesson: Lesson = {
  id: "open-courses",
  number: 1,
  title: "1. Meet the six courses",
  summary: "Play open courses.",
  guitarist_tip: "Fourths tuning.",
  steps: [
    { course: 6, position: 0, pitch: 48, label: "C" },
    { course: 5, position: 0, pitch: 58, label: "F" },
    { course: 6, position: 0, pitch: 48, label: "C" },
  ],
};

test("isStepHit checks whether the played pitch matches the expected step", () => {
  const step = lesson.steps[0];
  expect(step).toBeDefined();
  if (!step) return;
  expect(isStepHit(step, { course: 6, position: 0, pitch: 48 })).toBe(true);
  expect(isStepHit(step, { course: 5, position: 0, pitch: 58 })).toBe(false);
});

test("completeLesson adds each lesson id once without mutating input", () => {
  const initial = ["open-courses"];
  expect(completeLesson(initial, "quarter-tone")).toEqual(["open-courses", "quarter-tone"]);
  expect(completeLesson(initial, "open-courses")).toEqual(["open-courses"]);
  expect(initial).toEqual(["open-courses"]);
});

test("firstPendingLesson selects the first uncompleted lesson, else the first", () => {
  const second: Lesson = { ...lesson, id: "quarter-tone", number: 2 };
  expect(firstPendingLesson([lesson, second], [])).toBe("open-courses");
  expect(firstPendingLesson([lesson, second], ["open-courses"])).toBe("quarter-tone");
  expect(firstPendingLesson([lesson, second], ["open-courses", "quarter-tone"])).toBe(
    "open-courses",
  );
  expect(firstPendingLesson([], [])).toBeNull();
});

test("lessonMarkers highlights the active step or playback location without duplicate spots", () => {
  expect(lessonMarkers(lesson, 0, null)).toEqual([
    { course: 6, position: 0, label: "C", tone: "active" },
    { course: 5, position: 0, label: "F", tone: "normal" },
  ]);
  expect(lessonMarkers(lesson, 0, { course: 5, position: 0 })).toEqual([
    { course: 6, position: 0, label: "C", tone: "normal" },
    { course: 5, position: 0, label: "F", tone: "active" },
  ]);
  expect(lessonMarkers(lesson, 99, null)).toEqual([
    { course: 6, position: 0, label: "C", tone: "normal" },
    { course: 5, position: 0, label: "F", tone: "normal" },
  ]);
});
