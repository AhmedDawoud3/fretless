import { expect, test } from "vitest";
import { fullNeck, INTERVALS } from "../../testApi";
import type { DrillContext } from "../drill";
import { pitchClass } from "../neckLookup";
import { seeded } from "../testRandom";
import { makeMicQuestion, micItemKey } from "./question";

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
const ask = (level: number) => SEEDS.map((s) => makeMicQuestion(contextAt(level), seeded(s)));
const at = (q: { course: number; position: number }) =>
  fullNeck.locations.find((l) => l.course === q.course && l.position === q.position);

test.each([1, 2, 3, 4])(
  "level %i: every question can be answered from the neck, at its marked place",
  (level) => {
    for (const q of ask(level)) expect(at(q)?.pitch).toBe(q.pitch);
  },
);

test("level 1: open courses only, every one comes up", () => {
  const opens = fullNeck.courses.map((c) => c.open_pitch).sort((a, b) => a - b);
  const qs = ask(1);
  for (const q of qs) expect(q.position).toBe(0);
  expect([...new Set(qs.map((q) => q.pitch))].sort((a, b) => a - b)).toEqual(opens);
});

test("level 2: natural notes in first position (within 8 steps of the nut)", () => {
  for (const q of ask(2)) {
    expect(at(q)?.name.alter).toBe(0);
    expect(q.position).toBeLessThanOrEqual(8);
  }
});

test("level 3: sharps and flats only, in first position", () => {
  for (const q of ask(3)) {
    expect([2, -2]).toContain(at(q)?.name.alter);
    expect(q.position).toBeLessThanOrEqual(8);
  }
});

test("level 4: quarter tones (half-flats and half-sharps), in first position", () => {
  const qs = ask(4);
  for (const q of qs) {
    expect([1, -1]).toContain(at(q)?.name.alter);
    expect(q.position).toBeLessThanOrEqual(8);
  }
  expect(new Set(qs.map((q) => q.pitch)).size).toBeGreaterThan(5);
});

test("the marked place is the one nearest the nut for that pitch", () => {
  for (const q of ask(2)) {
    const places = fullNeck.locations.filter((l) => l.pitch === q.pitch);
    expect(q.position).toBe(Math.min(...places.map((l) => l.position)));
  }
});

test("the item key is the pitch class; a note always played right comes up less often", () => {
  const q = ask(2)[0];
  if (!q) throw new Error("no question");
  expect(micItemKey(q)).toBe(String(pitchClass(q.pitch)));
  const stats = {
    [String(pitchClass(fullNeck.courses[0]?.open_pitch ?? 0))]: { attempts: 30, correct: 30 },
  };
  const count = (level: number, withStats: DrillContext["stats"]) =>
    SEEDS.filter(
      (s) =>
        makeMicQuestion(contextAt(level, withStats), seeded(s)).pitch ===
        fullNeck.courses[0]?.open_pitch,
    ).length;
  expect(count(1, stats)).toBeLessThan(count(1, {}));
});
