import { expect, test } from "vitest";
import { parseSettings } from "./settings";

const parse = (patch: unknown) => parseSettings(JSON.stringify(patch));

test("the converter is a page that can be remembered", () => {
  expect(parse({ page: "tab" }).page).toBe("tab");
});

test("the output mode is frets, names or both; anything else is frets", () => {
  expect(["frets", "names", "both"].map((m) => parse({ tabMode: m }).tabMode)).toEqual([
    "frets",
    "names",
    "both",
  ]);
  expect([parse({ tabMode: "none" }).tabMode, parse({ tabMode: 3 }).tabMode]).toEqual([
    "frets",
    "frets",
  ]);
});

test("pasted text is remembered up to the API limit and not beyond", () => {
  const limit = "e".repeat(200_000);
  expect(parse({ tabText: "e|--0--|" }).tabText).toBe("e|--0--|");
  expect(parse({ tabText: limit }).tabText).toBe(limit);
  expect(parse({ tabText: `${limit}e` }).tabText).toBe("");
  expect(parse({ tabText: 5 }).tabText).toBe("");
});
