import { stepsToFrequency } from "../audio/frequency";
import type { Detection } from "./detectPitch";
import { CENTS_PER_STEP } from "./compare";
import { frequencyToSteps } from "./steps";

export type Reading =
  | { state: "silent" }
  | { state: "settling" }
  | { state: "steady"; steps: number; frequency: number; clarity: number };

export type TrackerOptions = {
  /** Consecutive agreeing frames before a pitch is steady. */
  minFrames?: number;
  /** Frames within this many cents of the recent median agree. */
  agreeCents?: number;
  /** Detections below this clarity are noise, not pitch. */
  minClarity?: number;
  /** Time with nothing heard after which the tracker forgets everything. */
  silenceMs?: number;
  /** How many recent agreeing frames feed the median. */
  windowFrames?: number;
};

export type Tracker = { push(detection: Detection | null, timeMs: number): Reading };

type Frame = { steps: number; clarity: number };

const DEFAULTS: Required<TrackerOptions> = {
  minFrames: 3,
  agreeCents: 30,
  minClarity: 0.8,
  silenceMs: 300,
  windowFrames: 5,
};

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const medianSteps = (frames: Frame[]) => median(frames.map((f) => f.steps));

function steadyReading(frames: Frame[]): Reading {
  const steps = medianSteps(frames);
  return {
    state: "steady",
    steps,
    frequency: stepsToFrequency(steps),
    clarity: median(frames.map((f) => f.clarity)),
  };
}

/**
 * Turns per-frame detections into a stable reading. A pitch is steady after
 * `minFrames` agreeing frames; frames that disagree wait in a pending run and
 * only replace the steady pitch once they too have held for `minFrames`, so a
 * lone octave glitch never shows.
 */
export function createTracker(options: TrackerOptions = {}): Tracker {
  const o = { ...DEFAULTS, ...options };
  const agreeSteps = o.agreeCents / CENTS_PER_STEP;
  let agreeing: Frame[] = [];
  let pending: Frame[] = [];
  let lastHeardMs = Number.NEGATIVE_INFINITY;
  let reading: Reading = { state: "silent" };

  const agrees = (frames: Frame[], frame: Frame) =>
    frames.length === 0 || Math.abs(frame.steps - medianSteps(frames)) <= agreeSteps;

  function addFrame(frame: Frame): void {
    if (agrees(agreeing, frame)) {
      agreeing = [...agreeing, frame].slice(-o.windowFrames);
      pending = [];
      return;
    }
    pending = agrees(pending, frame) ? [...pending, frame] : [frame];
    if (pending.length >= o.minFrames) {
      agreeing = pending;
      pending = [];
    }
  }

  function settle(): Reading {
    if (agreeing.length >= o.minFrames) return steadyReading(agreeing);
    return { state: "settling" };
  }

  return {
    push(detection, timeMs) {
      if (detection === null) {
        if (timeMs - lastHeardMs > o.silenceMs) {
          agreeing = [];
          pending = [];
          reading = { state: "silent" };
        }
        return reading;
      }
      lastHeardMs = timeMs;
      if (detection.clarity < o.minClarity) {
        if (reading.state === "silent") reading = { state: "settling" };
        return reading;
      }
      addFrame({ steps: frequencyToSteps(detection.frequency), clarity: detection.clarity });
      reading = settle();
      return reading;
    },
  };
}
