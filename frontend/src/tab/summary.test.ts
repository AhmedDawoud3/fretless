import { expect, test } from "vitest";
import type { ConvertedSummary } from "../api/client";
import { summaryLine } from "./summary";

const base: ConvertedSummary = {
  notes_in: 42,
  notes_out: 40,
  transposed_steps: 0,
  octave_shifted: 0,
  chords_reduced: 0,
  unsupported_systems: 0,
};

test("says how many notes went in and came out, and nothing else when nothing changed", () => {
  expect(summaryLine(base)).toBe("42 notes in, 40 out");
});

test("a single note is not plural", () => {
  expect(summaryLine({ ...base, notes_in: 1, notes_out: 1 })).toBe("1 note in, 1 out");
});

test("names the whole-piece move by direction and octaves", () => {
  expect(summaryLine({ ...base, transposed_steps: -24 })).toContain(
    "whole piece moved down one octave",
  );
  expect(summaryLine({ ...base, transposed_steps: 48 })).toContain(
    "whole piece moved up two octaves",
  );
});

test("lists chords simplified, notes moved and systems left as they were", () => {
  const line = summaryLine({
    ...base,
    transposed_steps: -24,
    chords_reduced: 3,
    octave_shifted: 1,
    unsupported_systems: 2,
  });
  expect(line).toBe(
    "42 notes in, 40 out · whole piece moved down one octave · 3 chords simplified · " +
      "1 note moved an octave · 2 systems left as they were",
  );
});

test("one chord, several notes, one system", () => {
  const line = summaryLine({
    ...base,
    chords_reduced: 1,
    octave_shifted: 2,
    unsupported_systems: 1,
  });
  expect(line).toContain("1 chord simplified");
  expect(line).toContain("2 notes moved an octave");
  expect(line).toContain("1 system left as it was");
});
