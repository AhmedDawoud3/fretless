import { expect, test } from "vitest";
import type { NeckOut } from "../api/client";
import { toPlay } from "./play";

const neck: NeckOut = {
  tuning: { id: "cc", label: "C-C" },
  courses: [
    { course: 1, open_pitch: 100, max_position: 24 },
    { course: 2, open_pitch: 80, max_position: 14 },
  ],
  locations: [],
};

test("snapped press rounds the position and adds it to the open pitch", () => {
  expect(toPlay(neck, { course: 2, position: 6.6 }, true)).toEqual({
    course: 2,
    position: 7,
    pitch: 87,
  });
});

test("continuous press keeps the fractional position and pitch", () => {
  expect(toPlay(neck, { course: 1, position: 6.6 }, false)).toEqual({
    course: 1,
    position: 6.6,
    pitch: 106.6,
  });
});
