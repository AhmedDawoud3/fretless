import { expect, test } from "vitest";
import { checkFind } from "./check";
import type { FindQuestion } from "./question";

const e = { letter: "E", alter: -1, octave: 0 } as const;
const anywhere: FindQuestion = { pitchClass: 7, name: e, course: null, targets: [] };
const onCourse3: FindQuestion = { ...anywhere, course: 3 };
const press = (course: number, pitch: number) => ({ course, position: 0, pitch });

test("any course will do when none is named; the octave does not matter", () => {
  expect(checkFind(anywhere, press(1, 103)).correct).toBe(true);
  expect(checkFind(anywhere, press(6, 55)).correct).toBe(true);
});

test("the wrong note is wrong", () => {
  expect(checkFind(anywhere, press(1, 104)).correct).toBe(false);
});

test("a named course must be the one pressed", () => {
  expect(checkFind(onCourse3, press(3, 79)).correct).toBe(true);
  expect(checkFind(onCourse3, press(2, 79)).correct).toBe(false);
});

test("the result keeps what was pressed", () => {
  expect(checkFind(anywhere, press(2, 90)).pressed).toEqual(press(2, 90));
});
