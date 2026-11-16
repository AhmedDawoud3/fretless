import { expect, test } from "vitest";
import { fullNeck, INTERVALS } from "../../testApi";
import type { DrillContext } from "../drill";
import { lowestLocation } from "../neckLookup";
import { seeded } from "../testRandom";
import { makeIntervalQuestion } from "./question";

const contextAt = (level: number, stats: DrillContext["stats"] = {}): DrillContext => ({
  neck: fullNeck,
  intervals: INTERVALS,
  system: "letters",
  guides: true,
  level,
  stats,
});

const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);
const ask = (level: number) => SEEDS.map((s) => makeIntervalQuestion(contextAt(level), seeded(s)));

test.each([1, 2, 3, 4])("level %i: both notes of every question exist on the neck", (level) => {
  for (const q of ask(level)) {
    expect(lowestLocation(fullNeck, q.low)).toBeDefined();
    expect(lowestLocation(fullNeck, q.low + q.interval.steps)).toBeDefined();
  }
});

test.each([1, 2, 3, 4])(
  "level %i: the answer is among the options, none above the level",
  (level) => {
    for (const q of ask(level)) {
      expect(q.options.some((o) => o.id === q.interval.id)).toBe(true);
      expect(q.options.every((o) => o.level <= level)).toBe(true);
    }
  },
);

test("the options grow with the level, and only level 4 has quarter-tone intervals", () => {
  const sizes = [1, 2, 3, 4].map((l) => ask(l)[0]?.options.length ?? 0);
  expect(sizes).toEqual([5, 9, 13, 18]);
  expect(ask(3).every((q) => !q.interval.quarter_tone)).toBe(true);
  expect(ask(4).some((q) => q.interval.quarter_tone)).toBe(true);
});

test("options are listed from the smallest interval to the largest", () => {
  const steps = ask(4)[0]?.options.map((o) => o.steps) ?? [];
  expect(steps).toEqual([...steps].sort((a, b) => a - b));
});

test("the start note is an even pitch in the middle of the range of the oud", () => {
  for (const q of ask(4)) {
    expect(q.low % 2).toBe(0);
    expect(q.low).toBeGreaterThanOrEqual(66);
    expect(q.low).toBeLessThanOrEqual(84);
  }
});

test("the same seed asks the same question", () => {
  expect(makeIntervalQuestion(contextAt(2), seeded(4))).toEqual(
    makeIntervalQuestion(contextAt(2), seeded(4)),
  );
});

test("an interval the user keeps missing comes up more often than ones they know", () => {
  const known = { attempts: 12, correct: 12 };
  const stats = Object.fromEntries(
    INTERVALS.filter((i) => i.level === 1 && i.id !== "perfect_fifth").map((i) => [i.id, known]),
  );
  const share = (tallies: DrillContext["stats"]) =>
    SEEDS.filter(
      (s) => makeIntervalQuestion(contextAt(1, tallies), seeded(s)).interval.id === "perfect_fifth",
    ).length;
  expect(share(stats)).toBeGreaterThan(share({}) * 1.5);
});
