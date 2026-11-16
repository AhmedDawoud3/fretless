import { expect, test } from "vitest";
import type { Reading } from "../../listen";
import { matchedCourses, tunerReading } from "./tuner";

const steady = (steps: number): Reading => ({
  state: "steady",
  steps,
  frequency: 440,
  clarity: 0.95,
});

test("nothing heard shows nothing", () => {
  expect(tunerReading({ state: "silent" })).toBeNull();
  expect(tunerReading({ state: "settling" })).toBeNull();
});

test("the nearest step and the cents from it", () => {
  const heard = tunerReading(steady(114.2));
  expect(heard?.step).toBe(114);
  expect(heard?.cents).toBeCloseTo(10, 5);
  expect(tunerReading(steady(113.7))?.cents).toBeCloseTo(-15, 5);
});

const courses = [
  { course: 1, open_pitch: 96 },
  { course: 2, open_pitch: 86 },
];

test("a course is matched when the note heard is its open note within 15 cents", () => {
  expect(matchedCourses(steady(86.2), courses)).toEqual([2]);
  expect(matchedCourses(steady(96), courses)).toEqual([1]);
  expect(matchedCourses(steady(86.5), courses)).toEqual([]);
});

test("an octave away does not match an open course, and silence matches nothing", () => {
  expect(matchedCourses(steady(110), courses)).toEqual([]);
  expect(matchedCourses({ state: "silent" }, courses)).toEqual([]);
});
