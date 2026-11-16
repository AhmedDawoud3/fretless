import { expect, test } from "vitest";
import { pickWeighted, weightOf } from "./weighted";

test("an unseen item weighs more than one that is always right", () => {
  expect(weightOf(undefined)).toBeGreaterThan(weightOf({ attempts: 10, correct: 10 }));
});

test("a mostly wrong item weighs more than a mostly right one", () => {
  expect(weightOf({ attempts: 10, correct: 2 })).toBeGreaterThan(
    weightOf({ attempts: 10, correct: 9 }),
  );
});

test("no weight is ever zero", () => {
  for (const attempts of [0, 1, 5, 1000]) {
    for (const correct of [0, attempts]) {
      expect(weightOf({ attempts, correct })).toBeGreaterThan(0);
    }
  }
});

test("the random number picks along the weights, first item at 0 and last just under 1", () => {
  const stats = {};
  expect(pickWeighted(["a", "b", "c"], stats, () => 0)).toBe("a");
  expect(pickWeighted(["a", "b", "c"], stats, () => 0.999999)).toBe("c");
  expect(pickWeighted(["a", "b", "c"], stats, () => 0.5)).toBe("b");
});

test("over many draws a weak item comes up much more than a mastered one", () => {
  const stats = { weak: { attempts: 10, correct: 0 }, strong: { attempts: 10, correct: 10 } };
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const counts = { weak: 0, strong: 0 };
  for (let i = 0; i < 2000; i++) {
    const item = pickWeighted(["weak", "strong"], stats, random);
    if (item === "weak" || item === "strong") counts[item]++;
  }
  expect(counts.weak).toBeGreaterThan(counts.strong * 2);
  expect(counts.strong).toBeGreaterThan(0);
});

test("picking from nothing is an error, not a made-up item", () => {
  expect(() => pickWeighted([], {}, () => 0)).toThrow(RangeError);
});
