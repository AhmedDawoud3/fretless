import { expect, test } from "vitest";
import type { Alteration, ConvertedSystem } from "../api/client";
import { groupAlterations, locationText } from "./alterations";

const alt = (
  kind: Alteration["kind"],
  system: number | null,
  column: number | null,
): Alteration => ({
  kind,
  system,
  column,
  message: `${kind} message`,
});

const system = (index: number, columns: number[]): ConvertedSystem => ({
  index,
  width: 40,
  bars: [],
  labels: [],
  columns: columns.map((c) => ({ index: c, notes: [] })),
  techniques: {},
});

test("alterations are grouped by kind in a fixed order, each group in the given order", () => {
  const groups = groupAlterations([
    alt("chord_reduced", 0, 4),
    alt("octave_shifted", 0, 2),
    alt("transposed", null, null),
    alt("chord_reduced", 1, 6),
  ]);
  expect(groups.map((g) => [g.title, g.items.length])).toEqual([
    ["Whole piece moved", 1],
    ["Notes moved an octave", 1],
    ["Chords simplified", 2],
  ]);
  expect(groups[2]?.items.map((a) => a.system)).toEqual([0, 1]);
});

test("a kind with no alterations has no group", () => {
  expect(groupAlterations([])).toEqual([]);
});

test("a location counts systems and columns from 1, columns in the order they sound", () => {
  const systems = [system(0, [2, 5]), system(1, [1, 4, 9])];
  expect(locationText(alt("chord_reduced", 1, 4), systems)).toBe("system 2, column 2");
  expect(locationText(alt("chord_reduced", 0, 5), systems)).toBe("system 1, column 2");
});

test("a whole-system alteration names only the system; a whole-piece one has no place", () => {
  expect(locationText(alt("unsupported_system", 2, null), [])).toBe("system 3");
  expect(locationText(alt("transposed", null, null), [])).toBe("whole piece");
});

test("a column the output does not hold is named by the system only", () => {
  expect(locationText(alt("octave_shifted", 0, 99), [system(0, [2])])).toBe("system 1");
});
