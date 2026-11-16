import { expect, test } from "vitest";
import { pick } from "./random";
import { seeded } from "./testRandom";

test("pick takes the item the random number points at, and never runs off the end", () => {
  expect(pick(["a", "b", "c"], () => 0)).toBe("a");
  expect(pick(["a", "b", "c"], () => 0.5)).toBe("b");
  expect(pick(["a", "b", "c"], () => 1)).toBe("c");
});

test("picking from nothing is an error", () => {
  expect(() => pick([], () => 0)).toThrow(RangeError);
});

test("a seeded random repeats for the same seed and stays in [0, 1)", () => {
  const a = seeded(5);
  const b = seeded(5);
  const run = (r: () => number) => Array.from({ length: 50 }, r);
  const first = run(a);
  expect(run(b)).toEqual(first);
  expect(first.every((x) => x >= 0 && x < 1)).toBe(true);
  expect(new Set(first).size).toBeGreaterThan(40);
});
