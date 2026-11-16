import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import App from "../App";
import { fullNeck, INTERVALS, MAQAMAT, stubApi } from "../testApi";
import type { DrillContext } from "./drill";
import { makeFindQuestion } from "./find/question";
import { makeIntervalQuestion } from "./interval/question";
import { pressNeck } from "./testPress";

/** The question line of the Find drill ("Find E half-flat anywhere"), not the card of the same name. */
const FIND_PROMPT = /^Find\s+(anywhere|on course)/;

vi.mock("../audio", () => ({ playSteps: vi.fn(), playTimed: vi.fn() }));

beforeEach(() => {
  // Every question is made with the first choice everywhere, so the tests know the answer.
  vi.spyOn(Math, "random").mockReturnValue(0);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const context = (level = 1): DrillContext => ({
  neck: fullNeck,
  intervals: INTERVALS,
  maqamat: MAQAMAT,
  system: "letters",
  guides: true,
  level,
  stats: {},
});

async function openPractice(fresh = true) {
  if (fresh) stubApi(fullNeck);
  render(<App />);
  fireEvent.click(await screen.findByRole("tab", { name: "Practice" }));
}

async function openDrill(title: RegExp) {
  await openPractice();
  fireEvent.click(await screen.findByRole("button", { name: title }));
}

/** Press the first right place for the Find question that Math.random = 0 makes. */
function pressFind(right: boolean) {
  const q = makeFindQuestion(context(), () => 0);
  const spot = right
    ? q.targets[0]
    : fullNeck.locations.find((l) => l.course === 1 && l.pitch % 24 !== q.pitchClass);
  if (!spot) throw new Error("no place to press");
  pressNeck(spot.course, spot.position);
}

test("the Practice page lists the drills with a line each, and no stats before any tries", async () => {
  await openPractice();
  for (const title of [/Find the note/, /Interval by ear/, /Echo/]) {
    expect(await screen.findByRole("button", { name: title })).toBeDefined();
  }
  expect(screen.getAllByText("Not tried yet")).toHaveLength(3);
  expect(screen.getByText(/Press where it is on the oud/)).toBeDefined();
});

test("a short note says how to practise", async () => {
  await openPractice();
  expect(await screen.findByText(/weak spots/i)).toBeDefined();
  expect(screen.getByText(/microphone/i)).toBeDefined();
});

test("choosing a drill shows its question", async () => {
  await openDrill(/Find the note/);
  expect(await screen.findByText(FIND_PROMPT)).toBeDefined();
  expect(screen.getByText("Streak 0")).toBeDefined();
});

test("a correct answer shows positive feedback and a streak of 1", async () => {
  await openDrill(/Find the note/);
  await screen.findByText(FIND_PROMPT);
  pressFind(true);
  expect(screen.getByRole("status").textContent).toContain("Correct");
  expect(screen.getByText("Streak 1")).toBeDefined();
});

test("a wrong answer shows the right answer on the oud", async () => {
  await openDrill(/Find the note/);
  await screen.findByText(FIND_PROMPT);
  pressFind(false);
  expect(screen.getByRole("status").textContent).toContain("Not quite");
  expect(screen.getByRole("status").textContent).toContain("is lit on the neck");
  expect(document.querySelectorAll(".marker-active").length).toBeGreaterThan(0);
});

test("Next gives a new question", async () => {
  await openDrill(/Find the note/);
  await screen.findByText(FIND_PROMPT);
  pressFind(true);
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.queryByRole("status")).toBeNull();
  expect(screen.getByText("Score 1 / 1")).toBeDefined();
});

test("number keys answer the interval drill", async () => {
  await openDrill(/Interval by ear/);
  await screen.findByText(/Which interval/);
  const q = makeIntervalQuestion(context(), () => 0);
  fireEvent.keyDown(window, {
    key: String(q.options.findIndex((o) => o.id === q.interval.id) + 1),
  });
  expect(screen.getByRole("status").textContent).toContain("Correct");
});

test("progress survives a remount, and shows on the drill's card", async () => {
  await openDrill(/Find the note/);
  await screen.findByText(FIND_PROMPT);
  pressFind(true);
  cleanup();
  await openPractice(false);
  const card = await screen.findByRole("button", { name: /Find the note/ });
  expect(card.textContent).toContain("1 try");
  expect(card.textContent).toContain("100%");
});

test("Reset progress asks first, keeps it on Keep, and clears it on confirm", async () => {
  await openDrill(/Find the note/);
  await screen.findByText(FIND_PROMPT);
  pressFind(true);
  fireEvent.click(screen.getByRole("button", { name: "Reset progress" }));
  fireEvent.click(screen.getByRole("button", { name: "Keep it" }));
  expect(screen.getByRole("button", { name: /Find the note/ }).textContent).toContain("1 try");
  fireEvent.click(screen.getByRole("button", { name: "Reset progress" }));
  fireEvent.click(screen.getByRole("button", { name: "Yes, reset" }));
  expect(screen.getByRole("button", { name: /Find the note/ }).textContent).toContain(
    "Not tried yet",
  );
});

test("the chosen difficulty gives a new question and is remembered", async () => {
  await openDrill(/Find the note/);
  await screen.findByText(FIND_PROMPT);
  fireEvent.change(screen.getByLabelText("Difficulty"), { target: { value: "2" } });
  expect(screen.getByText(FIND_PROMPT).textContent).toMatch(/on course \d/);
  cleanup();
  await openPractice(false);
  fireEvent.click(await screen.findByRole("button", { name: /Find the note/ }));
  expect(within(document.body).getByLabelText("Difficulty")).toHaveProperty("value", "2");
});

test("the Practice page is remembered like the others", async () => {
  await openPractice();
  await screen.findByRole("button", { name: /Echo/ });
  cleanup();
  render(<App />);
  expect(await screen.findByRole("button", { name: /Echo/ })).toBeDefined();
});

test("the shared Snap checkbox is hidden on Practice (every drill forces snap) and shown elsewhere", async () => {
  stubApi(fullNeck);
  render(<App />);
  expect(await screen.findByLabelText(/Snap to quarter tones/)).toBeDefined();
  fireEvent.click(await screen.findByRole("tab", { name: "Practice" }));
  await screen.findByRole("button", { name: /Find the note/ });
  expect(screen.queryByLabelText(/Snap to quarter tones/)).toBeNull();
});
