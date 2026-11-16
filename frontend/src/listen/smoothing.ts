import { stepsToFrequency } from "../audio/frequency";
import { CENTS_PER_STEP } from "./compare";
import type { Detection } from "./detectPitch";
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

type Run = { agreeing: Frame[]; pending: Frame[] };
type Config = Required<TrackerOptions>;

const agrees = (frames: Frame[], frame: Frame, agreeCents: number) =>
  frames.length === 0 || Math.abs(frame.steps - medianSteps(frames)) <= agreeCents / CENTS_PER_STEP;

/** Frames that disagree wait in `pending`, and replace `agreeing` only once they too have held. */
function addFrame(run: Run, frame: Frame, o: Config): Run {
  if (agrees(run.agreeing, frame, o.agreeCents)) {
    return { agreeing: [...run.agreeing, frame].slice(-o.windowFrames), pending: [] };
  }
  const pending = agrees(run.pending, frame, o.agreeCents) ? [...run.pending, frame] : [frame];
  return pending.length >= o.minFrames ? { agreeing: pending, pending: [] } : { ...run, pending };
}

function readingOf(run: Run, o: Config): Reading {
  return run.agreeing.length >= o.minFrames ? steadyReading(run.agreeing) : { state: "settling" };
}

const EMPTY: Run = { agreeing: [], pending: [] };

/**
 * Turns per-frame detections into a stable reading. A pitch is steady after
 * `minFrames` agreeing frames; frames that disagree only replace the steady
 * pitch once they too have held for `minFrames`, so a lone octave glitch never
 * shows. Unclear frames hold the last reading; `silenceMs` of nothing resets.
 */
export function createTracker(options: TrackerOptions = {}): Tracker {
  const o: Config = { ...DEFAULTS, ...options };
  let run = EMPTY;
  let lastHeardMs = Number.NEGATIVE_INFINITY;
  let reading: Reading = { state: "silent" };

  return {
    push(detection, timeMs) {
      if (detection === null) {
        if (timeMs - lastHeardMs > o.silenceMs) {
          run = EMPTY;
          reading = { state: "silent" };
        }
        return reading;
      }
      lastHeardMs = timeMs;
      if (detection.clarity < o.minClarity) {
        if (reading.state === "silent") reading = { state: "settling" };
        return reading;
      }
      const steps = frequencyToSteps(detection.frequency);
      run = addFrame(run, { steps, clarity: detection.clarity }, o);
      reading = readingOf(run, o);
      return reading;
    },
  };
}
