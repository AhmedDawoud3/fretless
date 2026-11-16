import { expect, test } from "vitest";
import { chosenLevel, parseLevels } from "./levels";

test("levels written by the app are read back", () => {
  expect(parseLevels({ find: 2, echo: 3 })).toEqual({ find: 2, echo: 3 });
});

test.each([null, 3, "x", [2]])("garbled levels %j mean none chosen", (raw) => {
  expect(parseLevels(raw)).toEqual({});
});

test("a level that is not a whole number from 1 to 4 is dropped on its own", () => {
  expect(parseLevels({ a: 0, b: 5, c: 1.5, d: "2", e: 4, f: 1 })).toEqual({ e: 4, f: 1 });
});

test("the chosen level is the saved one when the drill has it, else the drill's first", () => {
  const levels = [
    { level: 1, label: "a" },
    { level: 2, label: "b" },
  ];
  expect(chosenLevel(levels, 2)).toBe(2);
  expect(chosenLevel(levels, 3)).toBe(1);
  expect(chosenLevel(levels, undefined)).toBe(1);
  expect(chosenLevel([], 2)).toBe(1);
});
