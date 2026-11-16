import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { playSteps } from "../../audio";
import { fullNeck, INTERVALS } from "../../testApi";
import type { DrillContext } from "../drill";
import { pitchClass } from "../neckLookup";
import { pressNeck } from "../testPress";
import { seeded } from "../testRandom";
import { findNote } from "./findNote";
import { makeFindQuestion } from "./question";

vi.mock("../../audio", () => ({ playSteps: vi.fn(), playTimed: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.mocked(playSteps).mockClear();
});

const contextAt = (level: number): DrillContext => ({
  neck: fullNeck,
  intervals: INTERVALS,
  maqamat: [],
  system: "letters",
  guides: true,
  level,
  stats: {},
});

function show(level: number, seed = 3) {
  const context = contextAt(level);
  const onRecord = vi.fn();
  render(findNote.render({ context, onRecord, random: seeded(seed) }));
  return { question: makeFindQuestion(context, seeded(seed)), onRecord };
}

const markers = (tone: string) => document.querySelectorAll(`.marker-${tone}`).length;

test("level 1 asks for a natural note on any course", () => {
  show(1);
  expect(screen.getByText(/^Find/).textContent).toMatch(/^Find .+ anywhere$/);
});

test("level 2 names a course", () => {
  const { question } = show(2);
  expect(screen.getByText(/^Find/).textContent).toContain(`on course ${question.course}`);
});

test("pressing the right note is correct, plays it and lights every place it lives", () => {
  const { question, onRecord } = show(1);
  const target = question.targets[0];
  if (!target) throw new Error("no target");
  pressNeck(target.course, target.position);
  expect(screen.getByRole("status").textContent).toContain("Correct");
  expect(playSteps).toHaveBeenCalledTimes(1);
  expect(markers("active")).toBe(question.targets.length);
  expect(markers("root")).toBe(0);
  expect(onRecord).toHaveBeenCalledWith("find", String(question.pitchClass), true, 1);
});

test("pressing a wrong note says not quite, marks the press, and lights the right places", () => {
  const { question } = show(1);
  const wrong = fullNeck.locations.find(
    (l) => l.course === 1 && pitchClass(l.pitch) !== question.pitchClass,
  );
  if (!wrong) throw new Error("no wrong place");
  pressNeck(wrong.course, wrong.position);
  expect(screen.getByRole("status").textContent).toContain("Not quite");
  expect(screen.getByRole("status").textContent).toContain("is lit on the neck");
  expect(markers("active")).toBe(question.targets.length);
  expect(markers("root")).toBe(1);
});

test("after the answer, pressing the neck still plays the note but changes nothing", () => {
  const { question, onRecord } = show(1);
  const target = question.targets[0];
  if (!target) throw new Error("no target");
  pressNeck(target.course, target.position);
  pressNeck(1, 2);
  expect(playSteps).toHaveBeenCalledTimes(2);
  expect(onRecord).toHaveBeenCalledTimes(1);
});
