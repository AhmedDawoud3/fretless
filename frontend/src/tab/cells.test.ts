import { expect, test } from "vitest";
import type { ConvertedSystem } from "../api/client";
import { cellKey, locateCells } from "./cells";

const LABELS = ["C", "F", "A", "D", "G", "C"];
const note = (course: number) => ({ course, position: 0, pitch: 0, name: "C" });
const column = (index: number, ...courses: number[]) => ({ index, notes: courses.map(note) });
const system = (index: number, ...columns: ConvertedSystem["columns"]): ConvertedSystem => ({
  index,
  width: 0,
  bars: [],
  labels: LABELS,
  columns,
});
/** Six rendered lines, one per course; unnamed courses are empty. */
const rendered = (...contents: string[]) =>
  LABELS.map((label, i) => `${label}|${contents[i] ?? "-".repeat(contents[0]?.length ?? 0)}|`);

const found = (text: string, systems: ConvertedSystem[], key: string) =>
  locateCells(text, systems).filter((c) => c.key === key);

// "12" was widened: the next column moved from content index 5 to 7.
const TAB = rendered("--3----5--", "----12----", "-------0--").join("\n");
const COLUMNS = [column(2, 1), column(4, 2), column(5, 1, 3)];

test("a cell starts where its run starts on the line of its course", () => {
  const systems = [system(0, ...COLUMNS)];
  expect(found(TAB, systems, cellKey(0, 2))).toEqual([
    { key: "0:2", line: 0, start: 4, length: 1 },
  ]);
  expect(found(TAB, systems, cellKey(0, 4))).toEqual([
    { key: "0:4", line: 1, start: 6, length: 2 },
  ]);
});

test("a chord gives one cell on each line it has a note", () => {
  const cells = found(TAB, [system(0, ...COLUMNS)], cellKey(0, 5));
  expect(cells.map((c) => [c.line, c.start])).toEqual([
    [0, 9],
    [2, 9],
  ]);
});

test("lines before the system, and earlier systems, shift the line numbers", () => {
  const second = rendered("-4--", "----", "----").join("\n");
  const text = ["Title", TAB, "", second].join("\n");
  const systems = [system(0, ...COLUMNS), system(1, column(1, 1))];
  expect(found(text, systems, "0:2")[0]?.line).toBe(1);
  expect(found(text, systems, "1:1")).toEqual([{ key: "1:1", line: 8, start: 3, length: 1 }]);
});

test("a cell with a longer text, such as a name beside the fret, spans the whole run", () => {
  const text = rendered("-3(C)-", "------").join("\n");
  expect(found(text, [system(0, column(1, 1))], "0:1")[0]?.length).toBe(4);
});

test("a system whose lines do not hold its cells gets no cells at all", () => {
  expect(locateCells(TAB, [system(0, ...COLUMNS, column(8, 2))])).toEqual([]);
});

test("a system that is not in the text gets no cells", () => {
  expect(locateCells("just words\nand more", [system(0, column(1, 1))])).toEqual([]);
});
