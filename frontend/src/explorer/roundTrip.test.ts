import { expect, test } from "vitest";
import { roundTrip } from "./roundTrip";

test("goes up, then back down without repeating the top note", () => {
  expect(roundTrip([1, 2, 3, 4])).toEqual([1, 2, 3, 4, 3, 2, 1]);
});

test("a single note stays a single note", () => {
  expect(roundTrip([5])).toEqual([5]);
  expect(roundTrip([])).toEqual([]);
});
