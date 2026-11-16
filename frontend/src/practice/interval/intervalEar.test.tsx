import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { playTimed } from "../../audio";
import { fullNeck, INTERVALS } from "../../testApi";
import type { DrillContext } from "../drill";
import { seeded } from "../testRandom";
import { intervalEar } from "./intervalEar";
import { makeIntervalQuestion } from "./question";

vi.mock("../../audio", () => ({ playSteps: vi.fn(), playTimed: vi.fn() }));

const play = vi.mocked(playTimed);

afterEach(() => {
  cleanup();
  play.mockClear();
});

const contextAt = (level: number): DrillContext => ({
  neck: fullNeck,
  intervals: INTERVALS,
  system: "letters",
  guides: true,
  level,
  stats: {},
});

function show(level = 1, seed = 5) {
  const context = contextAt(level);
  const onRecord = vi.fn();
  render(intervalEar.render({ context, onRecord, random: seeded(seed) }));
  return { question: makeIntervalQuestion(context, seeded(seed)), onRecord };
}

const optionLabel = (name: string, frets: string) => new RegExp(`${name} · ${frets}`);

test("the two notes play, low then high, when a question appears", () => {
  const { question } = show();
  expect(play).toHaveBeenCalledTimes(1);
  const [events] = play.mock.calls[0] ?? [];
  expect(events?.map((e) => e.steps)).toEqual([
    [question.low],
    [question.low + question.interval.steps],
  ]);
  expect(events?.[1]?.at).toBeGreaterThan(events?.[0]?.at ?? 0);
});

test("Play again repeats them and Together plays them at the same moment", () => {
  show();
  fireEvent.click(screen.getByRole("button", { name: "Play again" }));
  expect(play).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole("button", { name: "Together" }));
  const [events] = play.mock.calls[2] ?? [];
  expect(events?.[0]?.at).toBe(events?.[1]?.at);
});

test("the options show each interval's name and guitar-fret wording", () => {
  show();
  expect(
    screen.getByRole("button", { name: optionLabel("Perfect fifth", "7 frets") }),
  ).toBeDefined();
  expect(screen.getByRole("button", { name: optionLabel("Minor third", "3 frets") })).toBeDefined();
  expect(screen.queryByRole("button", { name: /Major second/ })).toBeNull();
});

test("the neck stays hidden until the question is answered", () => {
  show();
  expect(screen.queryByRole("img", { name: /oud/i })).toBeNull();
});

test("the right interval is correct; then both notes show on the oud at their lowest places", () => {
  const { question, onRecord } = show();
  fireEvent.click(screen.getByRole("button", { name: new RegExp(question.interval.name) }));
  expect(screen.getByRole("status").textContent).toContain("Correct");
  expect(onRecord).toHaveBeenCalledWith("interval", question.interval.id, true, 1);
  expect(document.querySelectorAll(".marker-root")).toHaveLength(1);
  expect(document.querySelectorAll(".marker-active")).toHaveLength(1);
});

test("a wrong interval says not quite and names the right one", () => {
  const { question } = show();
  const wrong = question.options.find((o) => o.id !== question.interval.id);
  if (!wrong) throw new Error("only one option");
  fireEvent.click(screen.getByRole("button", { name: new RegExp(wrong.name) }));
  expect(screen.getByRole("status").textContent).toContain("Not quite");
  expect(screen.getByRole("status").textContent).toContain(question.interval.name.toLowerCase());
});

test("number keys 1 to 9 choose the options in order", () => {
  const { question, onRecord } = show();
  const place = question.options.findIndex((o) => o.id === question.interval.id) + 1;
  fireEvent.keyDown(window, { key: String(place) });
  expect(onRecord).toHaveBeenCalledWith("interval", question.interval.id, true, 1);
});

test("a number with no option does nothing", () => {
  const { onRecord } = show();
  fireEvent.keyDown(window, { key: "9" });
  expect(onRecord).not.toHaveBeenCalled();
});
