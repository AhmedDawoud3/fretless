import { expect, test } from "vitest";
import { fullNeck, INTERVALS } from "../../testApi";
import type { DrillContext } from "../drill";
import { pitchClass } from "../neckLookup";
import { seeded } from "../testRandom";
import { makeEchoQuestion } from "./question";

const contextAt = (level: number, stats: DrillContext["stats"] = {}): DrillContext => ({
  neck: fullNeck,
  intervals: INTERVALS,
  system: "letters",
  guides: true,
  level,
  stats,
});

const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);
const ask = (level: number) => SEEDS.map((s) => makeEchoQuestion(contextAt(level), seeded(s)));
const alterOf = (pitch: number) => fullNeck.locations.find((l) => l.pitch === pitch)?.name.alter;

test.each([1, 2, 3])(
  "level %i: the reference is an open course and the target is on the neck",
  (level) => {
    const opens = fullNeck.courses.map((c) => c.open_pitch);
    for (const q of ask(level)) {
      expect(opens).toContain(q.reference);
      expect(fullNeck.locations.some((l) => l.pitch === q.target)).toBe(true);
      expect(q.target).toBeGreaterThan(q.reference);
    }
  },
);

test("level 1: natural notes within a fifth above the reference", () => {
  for (const q of ask(1)) {
    expect(q.target - q.reference).toBeLessThanOrEqual(14);
    expect(alterOf(q.target)).toBe(0);
  }
});

test("level 2: any twelve-tone note within an octave, no quarter tones", () => {
  const questions = ask(2);
  for (const q of questions) {
    expect(q.target - q.reference).toBeLessThanOrEqual(24);
    expect(q.target % 2).toBe(0);
  }
  expect(questions.some((q) => alterOf(q.target) === 2)).toBe(true);
});

test("level 3: quarter tones are included", () => {
  const questions = ask(3);
  for (const q of questions) expect(q.target - q.reference).toBeLessThanOrEqual(24);
  expect(questions.some((q) => q.target % 2 === 1)).toBe(true);
});

test("the same seed asks the same question", () => {
  expect(makeEchoQuestion(contextAt(3), seeded(8))).toEqual(
    makeEchoQuestion(contextAt(3), seeded(8)),
  );
});

test("a note the user keeps missing comes up more often than ones they know", () => {
  const known = { attempts: 12, correct: 12 };
  const stats = Object.fromEntries(
    [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]
      .filter((pc) => pc !== 14)
      .map((pc) => [String(pc), known]),
  );
  const share = (tallies: DrillContext["stats"]) =>
    SEEDS.filter(
      (s) => pitchClass(makeEchoQuestion(contextAt(2, tallies), seeded(s)).target) === 14,
    ).length;
  expect(share(stats)).toBeGreaterThan(share({}) * 1.5);
});
