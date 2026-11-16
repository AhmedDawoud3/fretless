import { expect, test } from "vitest";
import { INTERVALS } from "../testApi";
import { describeGaps } from "./intervals";

test("a maqam's gaps are written in the API's guitar-fret wording, in order", () => {
  expect(describeGaps([4, 3, 3, 4, 4, 3, 3], INTERVALS)).toBe(
    "2 frets, 1½ frets, 1½ frets, 2 frets, 2 frets, 1½ frets, 1½ frets",
  );
});

test("a gap the API has no interval for is left out rather than guessed", () => {
  expect(describeGaps([4, 99, 2], INTERVALS)).toBe("2 frets, 1 fret");
});
