import { expect, test } from "vitest";
import { fullNeck, INTERVALS, MAQAMAT } from "../../testApi";
import type { DrillContext } from "../drill";
import { seeded } from "../testRandom";
import { MAQAM_LEVELS } from "./maqamLevels";
import { makeMaqamQuestion, maqamItemKey } from "./question";

const contextAt = (level: number, stats: DrillContext["stats"] = {}): DrillContext => ({
  neck: fullNeck,
  intervals: INTERVALS,
  maqamat: MAQAMAT,
  system: "letters",
  guides: true,
  level,
  stats,
});

const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);
const ask = (level: number) => SEEDS.map((s) => makeMaqamQuestion(contextAt(level), seeded(s)));

test.each([1, 2, 3])(
  "level %i: the answer is one of the options, and the options are the level's set",
  (level) => {
    for (const q of ask(level)) {
      expect(q.options.map((m) => m.id).sort()).toEqual([...(MAQAM_LEVELS[level] ?? [])].sort());
      expect(q.options).toContain(q.maqam);
    }
  },
);

test("levels 1 and 2 always play on the maqam's traditional root", () => {
  for (const level of [1, 2]) {
    for (const q of ask(level)) expect(q.root).toBe(q.maqam.default_root);
  }
});

test("level 3: the root is a twelve-tone pitch class, and varies", () => {
  const roots = ask(3).map((q) => q.root);
  for (const root of roots) {
    expect(root % 2).toBe(0);
    expect(root).toBeGreaterThanOrEqual(0);
    expect(root).toBeLessThan(24);
  }
  expect(new Set(roots).size).toBeGreaterThan(6);
  expect(ask(3).some((q) => q.root !== q.maqam.default_root)).toBe(true);
});

test("every maqam of the level comes up", () => {
  for (const level of [1, 2, 3]) {
    const seen = new Set(ask(level).map((q) => q.maqam.id));
    expect([...seen].sort()).toEqual([...(MAQAM_LEVELS[level] ?? [])].sort());
  }
});

test("a maqam the user misses comes up more often than one always right", () => {
  const stats = { ajam: { attempts: 20, correct: 20 }, hijaz: { attempts: 20, correct: 0 } };
  const count = (id: string) =>
    SEEDS.map((s) => makeMaqamQuestion(contextAt(1, stats), seeded(s))).filter(
      (q) => q.maqam.id === id,
    ).length;
  expect(count("hijaz")).toBeGreaterThan(count("ajam"));
});

test("the item key is the maqam id", () => {
  const q = ask(1)[0];
  if (!q) throw new Error("no question");
  expect(maqamItemKey(q)).toBe(q.maqam.id);
});
