import { expect, test } from "vitest";
import { formatNoteName } from "./noteName";
import { formatVirtualFret } from "./virtualFret";

test("letters system prints letter, alteration and octave", () => {
  expect(formatNoteName({ letter: "D", alter: 2, octave: 3 }, "letters", true)).toBe("D♯3");
});

test("solfege system renames letters", () => {
  const names = (["C", "D", "E", "F", "G", "A", "B"] as const).map((letter) =>
    formatNoteName({ letter, alter: 0, octave: 4 }, "solfege"),
  );
  expect(names).toEqual(["Do", "Re", "Mi", "Fa", "Sol", "La", "Si"]);
});

test("octave is omitted unless requested", () => {
  expect(formatNoteName({ letter: "E", alter: -1, octave: 3 }, "letters")).toBe("E𝄳");
});

test("every alteration has a distinct symbol", () => {
  const symbols = [-4, -3, -2, -1, 0, 1, 2, 3, 4].map((alter) =>
    formatNoteName({ letter: "C", alter, octave: 0 }, "letters"),
  );
  expect(new Set(symbols).size).toBe(9);
});

test("virtual fret is position / 2", () => {
  expect([0, 3, 4, 14].map(formatVirtualFret)).toEqual(["0", "1.5", "2", "7"]);
});
