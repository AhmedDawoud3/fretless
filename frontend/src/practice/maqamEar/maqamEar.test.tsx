import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { playSequence } from "../../audio";
import { fullNeck, INTERVALS, MAQAMAT, stubApi } from "../../testApi";
import type { DrillContext } from "../drill";
import { seeded } from "../testRandom";
import { maqamEar } from "./maqamEar";
import { makeMaqamQuestion } from "./question";

vi.mock("../../audio", () => ({ playSteps: vi.fn(), playTimed: vi.fn(), playSequence: vi.fn() }));

const play = vi.mocked(playSequence);

beforeEach(() => {
  stubApi(fullNeck);
});

afterEach(() => {
  cleanup();
  play.mockReset();
  vi.unstubAllGlobals();
});

const contextAt = (level: number): DrillContext => ({
  neck: fullNeck,
  intervals: INTERVALS,
  maqamat: MAQAMAT,
  system: "letters",
  guides: true,
  level,
  stats: {},
});

async function show(level = 1, seed = 5) {
  const context = contextAt(level);
  const onRecord = vi.fn();
  render(maqamEar.render({ context, onRecord, random: seeded(seed) }));
  const question = makeMaqamQuestion(context, seeded(seed));
  await screen.findByRole("button", { name: "Play again" });
  await waitFor(() => expect(play).toHaveBeenCalled());
  return { question, onRecord };
}

const optionFor = (name: string) => screen.getByRole("button", { name: new RegExp(name) });

test("shows a loading line until the scale has arrived", async () => {
  render(maqamEar.render({ context: contextAt(1), onRecord: vi.fn(), random: seeded(5) }));
  expect(screen.getByText(/Loading the scale/)).toBeDefined();
  await screen.findByRole("button", { name: "Play again" });
  expect(screen.queryByText(/Loading the scale/)).toBeNull();
});

test("the scale plays once it is loaded: up the octave and back down, ending on the root", async () => {
  const { question } = await show();
  expect(play).toHaveBeenCalledTimes(1);
  const [pitches] = play.mock.calls[0] ?? [];
  expect(pitches).toHaveLength(15);
  expect(pitches?.[0]).toBe(pitches?.[14]);
  expect(pitches?.[7]).toBe((pitches?.[0] ?? 0) + 24);
  expect(pitches?.[0]).toBe(96 + question.root);
});

test("one button per maqam of the level, with its English and Arabic name", async () => {
  await show(1);
  for (const [english, arabic] of [
    ["Ajam", "عجم"],
    ["Nahawand", "نهاوند"],
    ["Hijaz", "حجاز"],
  ]) {
    expect(optionFor(english as string).textContent).toContain(arabic);
  }
  expect(screen.queryByRole("button", { name: /Rast/ })).toBeNull();
});

test("Play again plays it again, and Slow plays it at a slower tempo", async () => {
  await show();
  fireEvent.click(screen.getByRole("button", { name: "Play again" }));
  fireEvent.click(screen.getByRole("button", { name: "Slow" }));
  expect(play).toHaveBeenCalledTimes(3);
  const [normal, slow] = [play.mock.calls[1]?.[1] ?? 0, play.mock.calls[2]?.[1] ?? 0];
  expect(slow).toBeLessThan(normal);
});

test("the neck stays hidden until the question is answered", async () => {
  await show();
  expect(screen.queryByRole("img", { name: /oud/i })).toBeNull();
});

test("the right maqam is correct; then the scale shows on the oud with the maqam's description", async () => {
  const { question, onRecord } = await show();
  fireEvent.click(optionFor(question.maqam.name));
  expect(screen.getByRole("status").textContent).toContain("Correct");
  expect(screen.getByRole("status").textContent).toContain(question.maqam.description);
  expect(onRecord).toHaveBeenCalledWith("maqam-ear", question.maqam.id, true, 1);
  expect(screen.getByRole("img", { name: /oud/i })).toBeDefined();
  expect(document.querySelectorAll(".marker-root")).toHaveLength(1);
  expect(document.querySelectorAll("[class*=marker-]").length).toBeGreaterThanOrEqual(7);
});

test("a wrong maqam says not quite and names the right one", async () => {
  const { question, onRecord } = await show();
  const wrong = question.options.find((m) => m.id !== question.maqam.id);
  if (!wrong) throw new Error("only one option");
  fireEvent.click(optionFor(wrong.name));
  expect(screen.getByRole("status").textContent).toContain("Not quite");
  expect(screen.getByRole("status").textContent).toContain(question.maqam.name);
  expect(onRecord).toHaveBeenCalledWith("maqam-ear", question.maqam.id, false, 0);
});

test("number keys choose the options in order", async () => {
  const { question, onRecord } = await show();
  const place = question.options.findIndex((m) => m.id === question.maqam.id) + 1;
  fireEvent.keyDown(window, { key: String(place) });
  expect(onRecord).toHaveBeenCalledWith("maqam-ear", question.maqam.id, true, 1);
});

test("a scale that fails to load shows an alert, and Skip moves on without counting", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: false, json: async () => ({}) })),
  );
  const onRecord = vi.fn();
  render(maqamEar.render({ context: contextAt(1), onRecord, random: seeded(5) }));
  expect((await screen.findByRole("alert")).textContent).toMatch(/Could not load/);
  expect(screen.queryByRole("button", { name: /Ajam/ })).toBeNull();
  const calls = vi.mocked(fetch).mock.calls.length;
  fireEvent.click(screen.getByRole("button", { name: "Skip this question" }));
  expect(onRecord).not.toHaveBeenCalled();
  await waitFor(() => expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThan(calls));
});
