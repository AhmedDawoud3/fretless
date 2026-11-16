import { describe, expect, it } from "vitest";
import { compareToTarget, nearestStep } from "./compare";

describe("compareToTarget", () => {
  it("is in tune within 15 cents, either side", () => {
    expect(compareToTarget(100.3, 100)).toMatchObject({ verdict: "in_tune", direction: "sharp" });
    expect(compareToTarget(99.7, 100)).toMatchObject({ verdict: "in_tune", direction: "flat" });
  });

  it("reports signed cents at 50 per step", () => {
    expect(compareToTarget(100.5, 100).cents).toBeCloseTo(25, 9);
    expect(compareToTarget(99.5, 100).cents).toBeCloseTo(-25, 9);
  });

  it("is close up to 35 cents and off beyond", () => {
    expect(compareToTarget(100.5, 100).verdict).toBe("close");
    expect(compareToTarget(100.8, 100).verdict).toBe("off");
  });

  it("has no direction on an exact hit", () => {
    expect(compareToTarget(100, 100)).toEqual({
      cents: 0,
      verdict: "in_tune",
      direction: "none",
      wrongNote: false,
    });
  });

  it("flags a wrong note beyond 75 cents only", () => {
    expect(compareToTarget(101.4, 100).wrongNote).toBe(false);
    expect(compareToTarget(101.6, 100).wrongNote).toBe(true);
    expect(compareToTarget(98.4, 100).wrongNote).toBe(true);
  });

  it("treats an octave away as wrong unless octave tolerant", () => {
    expect(compareToTarget(124, 100).wrongNote).toBe(true);
    expect(compareToTarget(124.2, 100, { octaveTolerant: true })).toMatchObject({
      verdict: "in_tune",
      direction: "sharp",
      wrongNote: false,
    });
    expect(compareToTarget(75.8, 100, { octaveTolerant: true }).cents).toBeCloseTo(-10, 9);
  });
});

describe("nearestStep", () => {
  it("returns the closest step and the signed cents from it", () => {
    const { step, cents } = nearestStep(100.2);
    expect(step).toBe(100);
    expect(cents).toBeCloseTo(10, 9);
    expect(nearestStep(99.7)).toMatchObject({ step: 100 });
    expect(nearestStep(99.7).cents).toBeCloseTo(-15, 9);
  });
});
