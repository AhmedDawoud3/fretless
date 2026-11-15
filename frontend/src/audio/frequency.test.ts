import { describe, expect, it } from "vitest";
import { stepsToFrequency } from "./frequency";

describe("stepsToFrequency", () => {
  it("maps A4 (114) to 440 Hz", () => {
    expect(stepsToFrequency(114)).toBeCloseTo(440, 6);
  });

  it("maps C4 (96) to middle C", () => {
    expect(stepsToFrequency(96)).toBeCloseTo(261.626, 3);
  });

  it("doubles the frequency every 24 steps", () => {
    expect(stepsToFrequency(138) / stepsToFrequency(114)).toBeCloseTo(2, 9);
  });

  it("multiplies by 2^(1/24) per step", () => {
    expect(stepsToFrequency(115) / stepsToFrequency(114)).toBeCloseTo(2 ** (1 / 24), 9);
  });

  it("accepts fractional steps between neighbours", () => {
    const f = stepsToFrequency(96.4);
    expect(f).toBeGreaterThan(stepsToFrequency(96));
    expect(f).toBeLessThan(stepsToFrequency(97));
  });
});
