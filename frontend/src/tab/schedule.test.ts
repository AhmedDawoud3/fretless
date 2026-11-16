import { expect, test } from "vitest";
import { eventStartSeconds, secondsPerTick } from "./schedule";

test("the first event starts at 0 and the rest follow their tick gaps", () => {
  expect(eventStartSeconds([10, 13, 19], 0.5, 16)).toEqual([0, 1.5, 4.5]);
});

test("a gap longer than the cap counts as the cap", () => {
  expect(eventStartSeconds([0, 3, 100, 103], 1, 16)).toEqual([0, 3, 19, 22]);
});

test("events at the same tick sound together, and a tick that goes back does not rewind", () => {
  expect(eventStartSeconds([5, 5, 4, 9], 1, 16)).toEqual([0, 0, 0, 5]);
});

test("no events, no starts", () => {
  expect(eventStartSeconds([], 1, 16)).toEqual([]);
});

test("speed is notes per minute, with a note taking three characters of tab", () => {
  expect(secondsPerTick(60)).toBeCloseTo(1 / 3);
  expect(secondsPerTick(120)).toBeCloseTo(1 / 6);
});
