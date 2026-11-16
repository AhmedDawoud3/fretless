import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { playSteps, playTimed } from "../../audio";
import { fullNeck, INTERVALS } from "../../testApi";
import type { DrillContext } from "../drill";
import { pressNeck } from "../testPress";
import { seeded } from "../testRandom";
import { echoDrill } from "./echoDrill";
import { makeEchoQuestion } from "./question";

vi.mock("../../audio", () => ({ playSteps: vi.fn(), playTimed: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.mocked(playSteps).mockClear();
  vi.mocked(playTimed).mockClear();
});

const context: DrillContext = {
  neck: fullNeck,
  intervals: INTERVALS,
  maqamat: [],
  system: "letters",
  guides: true,
  level: 1,
  stats: {},
};

function show(seed = 5) {
  const onRecord = vi.fn();
  render(echoDrill.render({ context, onRecord, random: seeded(seed) }));
  return { question: makeEchoQuestion(context, seeded(seed)), onRecord };
}

const placeOf = (matches: (pitch: number) => boolean) => {
  const spot = fullNeck.locations.find((l) => matches(l.pitch));
  if (!spot) throw new Error("no such place on the neck");
  return spot;
};
const press = (pitch: number) => {
  const spot = placeOf((p) => p === pitch);
  pressNeck(spot.course, spot.position);
};
const hint = () => document.querySelector(".echo-hint")?.textContent ?? "";

test("the reference then the hidden target play when a question appears", () => {
  const { question } = show();
  const [events] = vi.mocked(playTimed).mock.calls[0] ?? [];
  expect(events?.map((e) => e.steps)).toEqual([[question.reference], [question.target]]);
});

test("the reference is named and shown on the neck; the target is not", () => {
  const { question } = show();
  expect(screen.getByText(/Reference/).textContent).toMatch(/Reference: [A-G]/);
  expect(document.querySelectorAll(".marker")).toHaveLength(1);
  expect(question.target).toBeGreaterThan(question.reference);
});

test("a press plays what was pressed and says higher or lower", () => {
  const { question } = show();
  press(placeOf((p) => p < question.target).pitch);
  expect(playSteps).toHaveBeenCalledTimes(1);
  expect(hint()).toContain("higher");
  press(placeOf((p) => p > question.target).pitch);
  expect(hint()).toContain("lower");
  expect(screen.queryByRole("status")).toBeNull();
  expect(screen.getByText("Tries: 2")).toBeDefined();
});

test("finding it first time is correct and lights the note", () => {
  const { question, onRecord } = show();
  press(question.target);
  expect(screen.getByRole("status").textContent).toContain("Correct");
  expect(document.querySelectorAll(".marker-active").length).toBeGreaterThan(0);
  expect(onRecord).toHaveBeenCalledWith("echo", String(question.target % 24), true, 1);
});

test("finding it after misses counts the tries and is not a first-try hit", () => {
  const { question, onRecord } = show();
  press(placeOf((p) => p < question.target).pitch);
  press(question.target);
  expect(screen.getByRole("status").textContent).toContain("Not quite");
  expect(screen.getByRole("status").textContent).toContain("2 tries");
  expect(onRecord).toHaveBeenCalledWith("echo", String(question.target % 24), false, 0);
});

test("Show me gives up: the answer is named and lit", () => {
  const { question, onRecord } = show();
  fireEvent.click(screen.getByRole("button", { name: "Show me" }));
  expect(screen.getByRole("status").textContent).toContain("Not quite");
  expect(document.querySelectorAll(".marker-active").length).toBeGreaterThan(0);
  expect(onRecord).toHaveBeenCalledWith("echo", String(question.target % 24), false, 0);
});

test("Hear it again plays the reference and the target again", () => {
  show();
  fireEvent.click(screen.getByRole("button", { name: "Hear it again" }));
  expect(playTimed).toHaveBeenCalledTimes(2);
});

test("the next question starts with no tries and no hint", () => {
  const { question } = show();
  press(placeOf((p) => p < question.target).pitch);
  fireEvent.click(screen.getByRole("button", { name: "Show me" }));
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByText("Tries: 0")).toBeDefined();
  expect(hint()).toBe("");
});
