import { expect, test } from "vitest";
import type { ConvertedSystem } from "../api/client";
import { placeOudNote, renderOudSystemText, toggleGuitarNote } from "./tabEdit";

const SAMPLE_TAB = [
  "e|-----0-----|",
  "B|---1-------|",
  "G|-0---------|",
  "D|-----------|",
  "A|-3---------|",
  "E|-----------|",
].join("\n");

test("toggleGuitarNote writes a fret into an existing column and toggles it off on repeat", () => {
  const added = toggleGuitarNote(SAMPLE_TAB, 1, 1, 3);
  expect(added.split("\n")[0]).toBe("e|-3---0-----|");
  const removed = toggleGuitarNote(added, 1, 1, 3);
  expect(removed.split("\n")[0]).toBe("e|-----0-----|");
});

test("toggleGuitarNote appends a new column when columnIndex is null and initializes blank text", () => {
  const appended = toggleGuitarNote(SAMPLE_TAB, 2, null, 12);
  const lines = appended.split("\n");
  expect(lines[1]).toContain("12");
  expect(new Set(lines.map((l) => l.length)).size).toBe(1);

  const fresh = toggleGuitarNote("", 1, null, 5);
  expect(fresh.split("\n")).toHaveLength(6);
  expect(fresh.split("\n")[0]).toMatch(/^e\|.*5.*\|$/);
});

test("placeOudNote adds or toggles a note in an oud system and renders aligned ASCII tab", () => {
  const sys: ConvertedSystem = {
    index: 0,
    width: 8,
    bars: [],
    labels: ["C", "G", "D", "A", "F", "C"],
    columns: [{ index: 2, notes: [{ course: 1, position: 0, pitch: 96, name: "C" }] }],
    techniques: {},
  };
  const added = placeOudNote(sys, 2, { course: 2, position: 3, pitch: 89, name: "Ad" });
  expect(added.columns[0]?.notes).toHaveLength(2);
  expect(added.columns[0]?.notes[1]?.position).toBe(3);

  const appended = placeOudNote(added, null, { course: 3, position: 4, pitch: 80, name: "E" });
  expect(appended.columns).toHaveLength(2);

  const ascii = renderOudSystemText(appended, "frets");
  expect(ascii).toContain("G|--1.5");
  expect(ascii).toContain("D|-------2--|");
});

test("toggleGuitarNote clears/replaces technique tokens cleanly and renderOudSystemText keeps them", () => {
  const techTab = [
    "e|--5h--|",
    "B|------|",
    "G|------|",
    "D|------|",
    "A|------|",
    "E|------|",
  ].join("\n");
  const cleared = toggleGuitarNote(techTab, 1, 2, 5);
  expect(cleared.split("\n")[0]).toBe("e|------|");
  const replaced = toggleGuitarNote(techTab, 1, 2, 7);
  expect(replaced.split("\n")[0]).toBe("e|--7---|");
  expect(new Set(replaced.split("\n").map((l) => l.length)).size).toBe(1);

  const sys: ConvertedSystem = {
    index: 0,
    width: 8,
    bars: [],
    labels: ["C", "G", "D", "A", "F", "C"],
    columns: [{ index: 2, notes: [{ course: 1, position: 0, pitch: 96, name: "C" }] }],
    techniques: { "1:2": "h" },
  };
  expect(renderOudSystemText(sys, "frets")).toContain("C|--0h");
});
