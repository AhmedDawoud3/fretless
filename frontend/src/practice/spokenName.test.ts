import { expect, test } from "vitest";
import { spokenName } from "./spokenName";

test.each([
  [{ letter: "E", alter: 0, octave: 4 }, "letters", "E"],
  [{ letter: "E", alter: -1, octave: 4 }, "letters", "E half-flat"],
  [{ letter: "F", alter: 2, octave: 4 }, "letters", "F sharp"],
  [{ letter: "B", alter: -2, octave: 4 }, "letters", "B flat"],
  [{ letter: "C", alter: 1, octave: 4 }, "letters", "C half-sharp"],
  [{ letter: "E", alter: -1, octave: 4 }, "solfege", "Mi half-flat"],
  [{ letter: "A", alter: 0, octave: 4 }, "solfege", "La"],
] as const)("%j in %s reads %s", (name, system, words) => {
  expect(spokenName(name, system)).toBe(words);
});
