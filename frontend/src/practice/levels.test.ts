import { expect, test } from "vitest";
import { parseLevels } from "./levels";

test("levels written by the app are read back", () => {
  expect(parseLevels({ find: 2, echo: 3 })).toEqual({ find: 2, echo: 3 });
});

test.each([null, 3, "x", [2]])("garbled levels %j mean none chosen", (raw) => {
  expect(parseLevels(raw)).toEqual({});
});

test("a level that is not a whole number from 1 to 4 is dropped on its own", () => {
  expect(parseLevels({ a: 0, b: 5, c: 1.5, d: "2", e: 4, f: 1 })).toEqual({ e: 4, f: 1 });
});
