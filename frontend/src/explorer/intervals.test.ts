import { expect, test } from "vitest";
import { describeGaps, stepsToFrets } from "./intervals";

test.each([
  [1, "½ fret"],
  [2, "1 fret"],
  [3, "1½ frets"],
  [4, "2 frets"],
  [5, "2½ frets"],
  [6, "3 frets"],
])("%i steps read as %s on a guitar", (steps, words) => {
  expect(stepsToFrets(steps)).toBe(words);
});

test("a maqam's gaps are written in frets, in order", () => {
  expect(describeGaps([4, 3, 3, 4, 4, 3, 3])).toBe(
    "2 frets, 1½ frets, 1½ frets, 2 frets, 2 frets, 1½ frets, 1½ frets",
  );
});
