import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { playSteps } from "../../audio";
import { type MicrophoneStatus, type Reading, useMicrophone } from "../../listen";
import { fullNeck, INTERVALS } from "../../testApi";
import type { DrillContext } from "../drill";
import { nameOfPitchClass } from "../neckLookup";
import { spokenName } from "../spokenName";
import { seeded } from "../testRandom";
import { micDrill } from "./micDrill";
import { makeMicQuestion } from "./question";

vi.mock("../../audio", () => ({ playSteps: vi.fn(), playTimed: vi.fn() }));
vi.mock("../../listen", async (original) => ({
  ...(await original<typeof import("../../listen")>()),
  useMicrophone: vi.fn(),
}));

type Mic = ReturnType<typeof useMicrophone>;
let mic: Mic;
let now = 0;
const SILENT: Reading = { state: "silent" };

beforeEach(() => {
  now = 0;
  mic = { status: "listening", reading: SILENT, start: vi.fn(), stop: vi.fn() };
  vi.mocked(useMicrophone).mockImplementation(() => mic);
  vi.spyOn(performance, "now").mockImplementation(() => now);
});

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

const steady = (steps: number): Reading => ({
  state: "steady",
  steps,
  frequency: 440,
  clarity: 0.95,
});

function show(level = 1, seed = 5, status: MicrophoneStatus = "listening") {
  mic = { ...mic, status };
  const onRecord = vi.fn();
  const random = seeded(seed);
  const element = () => micDrill.render({ context: contextAt(level), onRecord, random });
  const view = render(element());
  const question = makeMicQuestion(contextAt(level), seeded(seed));
  const hear = (steps: number | null, at: number) => {
    now = at;
    mic = { ...mic, reading: steps === null ? SILENT : steady(steps) };
    view.rerender(element());
  };
  return { question, onRecord, hear, view };
}

const words = () => document.querySelector(".mic-words")?.textContent ?? "";
const spoken = (pitch: number) => {
  const name = nameOfPitchClass(fullNeck, pitch);
  if (!name) throw new Error("no name");
  return spokenName(name, "letters");
};

test("nothing starts by itself: a Start listening button, and a line that nothing is recorded", () => {
  show(1, 5, "idle");
  expect(mic.start).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Start listening" }));
  expect(mic.start).toHaveBeenCalledTimes(1);
  expect(screen.getByText(/Nothing is recorded or sent anywhere/)).toBeDefined();
});

test("while listening there is a visible Listening indicator and a Stop button", () => {
  show();
  expect(screen.getByText("Listening")).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: "Stop" }));
  expect(mic.stop).toHaveBeenCalled();
});

test("the target is named with its course and shown on the oud", () => {
  const { question } = show(1);
  const prompt = document.querySelector(".drill-prompt")?.textContent ?? "";
  expect(prompt).toContain(`Play ${spoken(question.pitch)} on course ${question.course}, open`);
  expect(document.querySelectorAll(".marker-root")).toHaveLength(1);
});

test("a note held in tune for half a second passes, and is recorded once as right", () => {
  const { question, onRecord, hear } = show(1);
  hear(question.pitch + 0.1, 1000);
  hear(question.pitch + 0.1, 1300);
  expect(onRecord).not.toHaveBeenCalled();
  hear(question.pitch - 0.1, 1520);
  expect(onRecord).toHaveBeenCalledTimes(1);
  expect(onRecord).toHaveBeenCalledWith("mic", String(question.pitch % 24), true, 1);
  expect(screen.getByRole("status").textContent).toContain("Correct");
});

test("a flat note shows flat wording, moves the meter, and does not pass", () => {
  const { question, onRecord, hear } = show(4);
  hear(question.pitch - 0.8, 1000);
  hear(question.pitch - 0.8, 2000);
  expect(words()).toContain("flat — slide up towards the bridge");
  expect(Number(screen.getByRole("meter").getAttribute("aria-valuenow"))).toBeCloseTo(-40, 5);
  expect(onRecord).not.toHaveBeenCalled();
});

test("on an open course a sharp note says to loosen the string", () => {
  const { question, hear } = show(1);
  hear(question.pitch + 0.8, 1000);
  expect(words()).toContain("sharp — loosen the string");
});

test("a different note names the note that was heard, with no cents reading", () => {
  const { question, onRecord, hear } = show(1);
  hear(question.pitch + 4, 1000);
  hear(question.pitch + 4, 2000);
  expect(words()).toBe(`I heard ${spoken(question.pitch + 4)}, not the note asked for.`);
  expect(screen.getByRole("meter").getAttribute("aria-valuenow")).toBeNull();
  expect(onRecord).not.toHaveBeenCalled();
});

test("drifting out of tune resets the hold", () => {
  const { question, onRecord, hear } = show(1);
  hear(question.pitch, 1000);
  hear(question.pitch + 0.8, 1400);
  hear(question.pitch, 1600);
  hear(question.pitch, 1900);
  expect(onRecord).not.toHaveBeenCalled();
  hear(question.pitch, 2200);
  expect(onRecord).toHaveBeenCalledWith("mic", String(question.pitch % 24), true, 1);
  expect(screen.getByRole("status").textContent).toContain("2 tries");
});

test("the note an octave higher counts, and says so", () => {
  const { question, onRecord, hear } = show(1);
  hear(question.pitch + 24, 1000);
  expect(words()).toContain("an octave higher, that counts");
  hear(question.pitch + 24, 1600);
  expect(onRecord).toHaveBeenCalledTimes(1);
});

test("Hear it plays the target, and readings are ignored while it rings and for 300 ms after", () => {
  const { question, onRecord, hear } = show(1);
  now = 1000;
  fireEvent.click(screen.getByRole("button", { name: "Hear it" }));
  expect(playSteps).toHaveBeenCalledWith(question.pitch);
  hear(question.pitch, 1200);
  hear(question.pitch, 3000);
  hear(question.pitch, 3700);
  expect(onRecord).not.toHaveBeenCalled();
  hear(question.pitch, 3900);
  hear(question.pitch, 4500);
  expect(onRecord).toHaveBeenCalledTimes(1);
});

test("Skip moves on without counting anything", () => {
  const { onRecord } = show(1);
  fireEvent.click(screen.getByRole("button", { name: "Skip" }));
  expect(onRecord).not.toHaveBeenCalled();
  expect(screen.queryByRole("status")).toBeNull();
});

test("denied: says how to allow the microphone and offers to try again", () => {
  show(1, 5, "denied");
  expect(screen.getByRole("alert").textContent).toMatch(/blocked.*Allow/);
  expect(screen.getByRole("button", { name: "Start listening" })).toBeDefined();
});

test("unsupported: says the microphone needs localhost or https", () => {
  show(1, 5, "unsupported");
  expect(screen.getByRole("alert").textContent).toMatch(/localhost or https/);
});

test("error: says it could not be opened", () => {
  show(1, 5, "error");
  expect(screen.getByRole("alert").textContent).toMatch(/could not be opened/);
});

test("leaving the drill, or the page, stops the microphone", () => {
  const { view } = show();
  window.dispatchEvent(new Event("pagehide"));
  expect(mic.stop).toHaveBeenCalled();
  vi.mocked(mic.stop).mockClear();
  view.unmount();
  expect(mic.stop).toHaveBeenCalled();
});

test("Tuner mode shows the nearest note and cents with no question, and lights the matching open course", () => {
  const { hear } = show(1);
  fireEvent.click(screen.getByRole("button", { name: "Tuner" }));
  expect(screen.queryByRole("button", { name: "Hear it" })).toBeNull();
  const second = fullNeck.courses[1];
  if (!second) throw new Error("no course");
  hear(second.open_pitch + 0.2, 1000);
  const tuner = document.querySelector(".tuner")?.textContent ?? "";
  expect(tuner).toContain(spoken(second.open_pitch));
  expect(tuner).toMatch(/10 cents sharp/);
  expect(document.querySelectorAll(".chip-lit")).toHaveLength(1);
  expect(document.querySelectorAll(".chip")).toHaveLength(6);
});

test("while in Tuner mode a note in tune for a while does not answer the hidden question", () => {
  const { question, onRecord, hear } = show(1);
  fireEvent.click(screen.getByRole("button", { name: "Tuner" }));
  hear(question.pitch, 1000);
  hear(question.pitch, 2000);
  expect(onRecord).not.toHaveBeenCalled();
});
