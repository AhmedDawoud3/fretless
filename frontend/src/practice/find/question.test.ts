import { expect, test } from "vitest";
import { fullNeck, INTERVALS } from "../../testApi";
import type { DrillContext } from "../drill";
import { pitchClass } from "../neckLookup";
import { seeded } from "../testRandom";
import { makeFindQuestion } from "./question";

const contextAt = (level: number, stats: DrillContext["stats"] = {}): DrillContext => ({
  neck: fullNeck,
  intervals: INTERVALS,
  maqamat: [],
  system: "letters",
  guides: true,
  level,
  stats,
});

const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);
const ask = (level: number) => SEEDS.map((s) => makeFindQuestion(contextAt(level), seeded(s)));
const onNeck = ({ course, position }: { course: number; position: number }) =>
  fullNeck.locations.find((l) => l.course === course && l.position === position);

test.each([1, 2, 3])("level %i: every question can be answered from the neck", (level) => {
  for (const q of ask(level)) {
    expect(q.targets.length).toBeGreaterThan(0);
    for (const t of q.targets) {
      const spot = onNeck(t);
      expect(spot && pitchClass(spot.pitch)).toBe(q.pitchClass);
      expect(q.course === null || t.course === q.course).toBe(true);
    }
  }
});

test("level 1: natural notes, any course, and one is in first position", () => {
  for (const q of ask(1)) {
    expect(q.name.alter).toBe(0);
    expect(q.course).toBeNull();
    expect(q.targets.some((t) => t.position <= 10)).toBe(true);
  }
});

test("level 2: sharps and flats join, a course is named, and the note is in first position there", () => {
  const questions = ask(2);
  const alters = new Set(questions.map((q) => q.name.alter));
  expect(alters.has(0) && (alters.has(2) || alters.has(-2))).toBe(true);
  expect([...alters].every((a) => [0, 2, -2].includes(a))).toBe(true);
  for (const q of questions) {
    expect(q.course).not.toBeNull();
    expect(q.targets.some((t) => t.position <= 10)).toBe(true);
  }
});

test("level 3: quarter tones join and the whole neck is used", () => {
  const questions = ask(3);
  expect(questions.some((q) => Math.abs(q.name.alter) === 1)).toBe(true);
  expect(questions.some((q) => q.targets.every((t) => t.position > 10))).toBe(true);
});

test("the same seed asks the same question", () => {
  expect(makeFindQuestion(contextAt(3), seeded(9))).toEqual(
    makeFindQuestion(contextAt(3), seeded(9)),
  );
});

test("a note the user keeps missing comes up more often than ones they know", () => {
  const known = { attempts: 12, correct: 12 };
  const stats = Object.fromEntries([0, 8, 10, 14, 18, 22].map((pc) => [String(pc), known]));
  const share = (tallies: DrillContext["stats"]) =>
    SEEDS.filter((s) => makeFindQuestion(contextAt(1, tallies), seeded(s)).pitchClass === 4).length;
  expect(share(stats)).toBeGreaterThan(share({}) * 2);
});
