import { expect, test } from "vitest";
import {
  clampCapo,
  cycleNut,
  openShape,
  PITCH_MAX,
  PITCH_MIN,
  pressFret,
  shiftString,
  soundingPitch,
} from "./shape";

test("a new shape has every string open", () => {
  expect(openShape()).toEqual([0, 0, 0, 0, 0, 0]);
});

test("pressing a fret puts the finger there, string 1 being the first entry", () => {
  expect(pressFret(openShape(), 2, 3)).toEqual([0, 3, 0, 0, 0, 0]);
});

test("a string holds one note: pressing another fret moves the finger", () => {
  expect(pressFret(pressFret(openShape(), 5, 3), 5, 7)).toEqual([0, 0, 0, 0, 7, 0]);
});

test("pressing the same spot again clears back to open, even from muted", () => {
  const pressed = pressFret(openShape(), 5, 3);
  expect(pressFret(pressed, 5, 3)).toEqual(openShape());
});

test("pressing a fret on a muted string un-mutes it", () => {
  expect(pressFret(cycleNut(openShape(), 6), 6, 2)).toEqual([0, 0, 0, 0, 0, 2]);
});

test("the nut control flips open to muted and muted back to open", () => {
  const muted = cycleNut(openShape(), 6);
  expect(muted).toEqual([0, 0, 0, 0, 0, null]);
  expect(cycleNut(muted, 6)).toEqual(openShape());
});

test("the nut control on a fretted string mutes it", () => {
  expect(cycleNut(pressFret(openShape(), 1, 4), 1)).toEqual([null, 0, 0, 0, 0, 0]);
});

test("tuning a string moves it a semitone, which is two steps", () => {
  expect(shiftString([64, 59], 1, 1)).toEqual([66, 59]);
  expect(shiftString([64, 59], 2, -1)).toEqual([64, 57]);
});

test("tuning stays inside the range the API accepts", () => {
  expect(shiftString([PITCH_MAX], 1, 1)).toEqual([PITCH_MAX]);
  expect(shiftString([PITCH_MIN], 1, -1)).toEqual([PITCH_MIN]);
});

test("the capo is a whole number from 0 to 12", () => {
  expect([clampCapo(-3), clampCapo(5), clampCapo(40), clampCapo(2.6)]).toEqual([0, 5, 12, 3]);
  expect(clampCapo(Number.NaN)).toBe(0);
});

test("a fretted note sounds two steps per fret above the capo, open or not", () => {
  expect(soundingPitch(64, 0, 0)).toBe(64);
  expect(soundingPitch(64, 3, 2)).toBe(74);
});
