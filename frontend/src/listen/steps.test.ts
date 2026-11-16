import { describe, expect, it } from "vitest";
import { stepsToFrequency } from "../audio/frequency";
import { frequencyToSteps } from "./steps";

describe("frequencyToSteps", () => {
  it("maps A4 to 114", () => {
    expect(frequencyToSteps(440)).toBeCloseTo(114, 9);
  });

  it("inverts stepsToFrequency, fractions included", () => {
    for (const steps of [0, 38, 77.5, 114, 130.25]) {
      expect(frequencyToSteps(stepsToFrequency(steps))).toBeCloseTo(steps, 9);
    }
  });

  it("is 24 steps per octave", () => {
    expect(frequencyToSteps(880) - frequencyToSteps(440)).toBeCloseTo(24, 9);
  });
});
