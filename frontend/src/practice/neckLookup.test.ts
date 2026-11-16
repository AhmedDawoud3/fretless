import { expect, test } from "vitest";
import { fullNeck } from "../testApi";
import {
  locationAt,
  lowestLocation,
  nameOfPitch,
  nameOfPitchClass,
  pitchClass,
} from "./neckLookup";

test("a pitch class is the pitch within its octave, 0 to 23", () => {
  expect([pitchClass(96), pitchClass(103), pitchClass(47)]).toEqual([0, 7, 23]);
});

test("the lowest location of a pitch is the one nearest the nut", () => {
  // G3 (86) is open on course 2, and also on course 3 at position 10.
  expect(lowestLocation(fullNeck, 86)).toMatchObject({ course: 2, position: 0 });
  // 90 is on course 2 at 4 and course 3 at 14: the nut side wins.
  expect(lowestLocation(fullNeck, 90)).toMatchObject({ course: 2, position: 4 });
});

test("a pitch the oud cannot play has no location", () => {
  expect(lowestLocation(fullNeck, 5)).toBeUndefined();
});

test("a location and a pitch can be looked up for their name", () => {
  expect(locationAt(fullNeck, 1, 0)?.pitch).toBe(96);
  expect(locationAt(fullNeck, 1, 99)).toBeUndefined();
  expect(nameOfPitch(fullNeck, 96)).toMatchObject({ letter: "C", alter: 0 });
});

test("nameOfPitchClass spells a note whatever octave, or nothing if the neck lacks it", () => {
  const d = nameOfPitchClass(fullNeck, 4 + 24 * 7);
  expect(d && [d.letter, d.alter]).toEqual(["D", 0]);
  expect(nameOfPitchClass({ ...fullNeck, locations: [] }, 4)).toBeUndefined();
});
