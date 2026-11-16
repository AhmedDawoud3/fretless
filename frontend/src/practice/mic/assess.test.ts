import { expect, test } from "vitest";
import type { Reading } from "../../listen";
import { assess, sampleOf } from "./assess";

const steady = (steps: number): Reading => ({
  state: "steady",
  steps,
  frequency: 440,
  clarity: 0.95,
});

test("a silent or settling reading is nothing heard", () => {
  expect(assess({ state: "silent" }, 100)).toEqual({ kind: "nothing" });
  expect(assess({ state: "settling" }, 100)).toEqual({ kind: "nothing" });
});

test("the target note, a little flat, is tuned with negative cents", () => {
  const heard = assess(steady(99.7), 100);
  expect(heard).toMatchObject({ kind: "tuned", octaves: 0 });
  expect(heard.kind === "tuned" && heard.comparison.cents).toBeCloseTo(-15, 5);
});

test("a different note is wrong, and names the nearest step that was heard", () => {
  expect(assess(steady(103.2), 100)).toEqual({ kind: "wrong", step: 103 });
});

test("the target an octave up or down is tuned, and says how many octaves", () => {
  expect(assess(steady(124), 100)).toMatchObject({ kind: "tuned", octaves: 1 });
  expect(assess(steady(76.2), 100)).toMatchObject({ kind: "tuned", octaves: -1 });
});

test("the sample for the hold: nothing, off for wrong or out of tune, in_tune within 15 cents", () => {
  expect(sampleOf(assess({ state: "silent" }, 100))).toBe("nothing");
  expect(sampleOf(assess(steady(103), 100))).toBe("off");
  expect(sampleOf(assess(steady(100.5), 100))).toBe("off");
  expect(sampleOf(assess(steady(100.2), 100))).toBe("in_tune");
  expect(sampleOf(assess(steady(124.1), 100))).toBe("in_tune");
});
