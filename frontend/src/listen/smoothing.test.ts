import { describe, expect, it } from "vitest";
import { stepsToFrequency } from "../audio/frequency";
import type { Detection } from "./detectPitch";
import { createTracker, type Reading } from "./smoothing";

const FRAME_MS = 20;

const hear = (steps: number, clarity = 0.95): Detection => ({
  frequency: stepsToFrequency(steps),
  clarity,
});

/** Feeds a script of detections (null = nothing heard) at a fixed frame rate. */
function run(script: (Detection | null)[], options = {}): Reading[] {
  const tracker = createTracker(options);
  return script.map((detection, i) => tracker.push(detection, i * FRAME_MS));
}

const steady = (steps: number) => expect.objectContaining({ state: "steady", steps });

describe("createTracker", () => {
  it("starts silent", () => {
    expect(run([null])[0]).toEqual({ state: "silent" });
  });

  it("settles for two frames, then reads steady", () => {
    const readings = run([hear(100), hear(100), hear(100)]);
    expect(readings.map((r) => r.state)).toEqual(["settling", "settling", "steady"]);
  });

  it("reports the median of the agreeing frames with frequency and clarity", () => {
    const readings = run([hear(100), hear(100.2), hear(99.9), hear(100.1)]);
    const last = readings[3];
    expect(last).toMatchObject({ state: "steady", clarity: 0.95 });
    if (last.state !== "steady") throw new Error("expected steady");
    expect(last.steps).toBeCloseTo(100.05, 9);
    expect(last.frequency).toBeCloseTo(stepsToFrequency(100.05), 6);
  });

  it("ignores onset noise (unclear frames) until the pitch is stable", () => {
    const noise = hear(60, 0.3);
    const readings = run([noise, noise, hear(100), hear(100), hear(100)]);
    expect(readings.slice(0, 4).map((r) => r.state)).toEqual([
      "settling",
      "settling",
      "settling",
      "settling",
    ]);
    expect(readings[4]).toEqual(steady(100));
  });

  it("does not agree on frames further apart than 30 cents", () => {
    const readings = run([hear(100), hear(100.7), hear(100), hear(100.7)]);
    expect(readings.every((r) => r.state === "settling")).toBe(true);
  });

  it("rejects a single octave-jump frame and keeps the steady pitch", () => {
    const readings = run([hear(100), hear(100), hear(100), hear(124), hear(100), hear(100)]);
    expect(readings[3]).toEqual(steady(100));
    expect(readings[5]).toEqual(steady(100));
  });

  it("follows a slide once the new pitch has held for three frames", () => {
    const script = [100, 100, 100, 108, 108, 108, 108].map((s) => hear(s));
    const readings = run(script);
    expect(readings[4]).toEqual(steady(100));
    expect(readings[5]).toEqual(steady(108));
  });

  it("holds the reading through a short gap and resets after 300 ms of silence", () => {
    const script = [hear(100), hear(100), hear(100), ...Array(20).fill(null)];
    const readings = run(script);
    expect(readings[3 + 5]).toEqual(steady(100));
    expect(readings[readings.length - 1]).toEqual({ state: "silent" });
    expect(readings[2 + 15].state).toBe("steady");
    expect(readings[2 + 16]).toEqual({ state: "silent" });
  });

  it("needs a fresh run of frames after silence", () => {
    const script = [hear(100), hear(100), hear(100), ...Array(20).fill(null), hear(100)];
    expect(run(script).at(-1)).toEqual({ state: "settling" });
  });

  it("respects custom options", () => {
    const readings = run([hear(100), hear(100)], { minFrames: 2 });
    expect(readings[1].state).toBe("steady");
  });
});
