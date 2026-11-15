import { expect, test } from "vitest";
import { fretCenterX, fretX, GUITAR_LAYOUT } from "./guitarLayout";

test("the nut is fret 0 and fret 12 is halfway along the string, as on the oud's position 24", () => {
  expect(fretX(0)).toBe(GUITAR_LAYOUT.nutX);
  expect(fretX(12)).toBeCloseTo(GUITAR_LAYOUT.nutX + GUITAR_LAYOUT.length / 2);
});

test("frets get narrower up the neck", () => {
  const widths = [1, 2, 6, 12].map((n) => fretX(n) - fretX(n - 1));
  expect(widths).toEqual([...widths].sort((a, b) => b - a));
});

test("a finger sits between the fret wire it is behind and the one before", () => {
  expect(fretCenterX(3)).toBeCloseTo((fretX(2) + fretX(3)) / 2);
});
