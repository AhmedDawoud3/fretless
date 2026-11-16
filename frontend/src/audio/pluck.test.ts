import { describe, expect, it } from "vitest";
import { renderGuitarPluck, renderPluck } from "./pluck";

const SAMPLE_RATE = 22050;
/** Browsers run audio at 44.1 or 48 kHz; the averaging filter darkens high notes more at 22 kHz. */
const BROWSER_RATE = 44100;

/** Small deterministic random source in [0, 1). */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const render = (frequency: number, seconds = 2) =>
  renderPluck(frequency, SAMPLE_RATE, seconds, seeded(7));

/** Half a second starting at 0.25 s, past the attack where upper harmonics add crossings. */
const sustain = (xs: Float32Array) => xs.subarray(SAMPLE_RATE / 4, (SAMPLE_RATE * 3) / 4);

const energy = (xs: Float32Array) => xs.reduce((sum, x) => sum + x * x, 0);

function zeroCrossings(xs: Float32Array): number {
  let count = 0;
  for (let i = 1; i < xs.length; i++) {
    if (xs[i - 1] < 0 !== xs[i] < 0) count++;
  }
  return count;
}

/** Pitch from the autocorrelation peak near the expected period, refined to sub-sample. */
function estimateFrequency(xs: Float32Array, sampleRate: number): number {
  const corr = (lag: number) => {
    let sum = 0;
    for (let i = 0; i + lag < xs.length; i++) sum += xs[i] * xs[i + lag];
    return sum;
  };
  // Search lags for 60 Hz..2 kHz, take the first strong peak (the fundamental period).
  const lags = Array.from({ length: Math.floor(sampleRate / 60) }, (_, i) => i).slice(
    Math.floor(sampleRate / 2000),
  );
  const values = lags.map(corr);
  const best = Math.max(...values);
  const k = values.findIndex(
    (v, i) => v > 0.9 * best && v >= (values[i - 1] ?? 0) && v >= (values[i + 1] ?? 0),
  );
  const [l, m, r] = [values[k - 1], values[k], values[k + 1]];
  const offset = (0.5 * (l - r)) / (l - 2 * m + r);
  return sampleRate / (lags[k] + offset);
}

/** Time of the last 50 ms window whose energy is within 40 dB of the loudest window. */
function secondsAboveMinus40dB(xs: Float32Array, sampleRate: number): number {
  const window = Math.round(sampleRate * 0.05);
  const energies = Array.from({ length: Math.floor(xs.length / window) }, (_, i) =>
    energy(xs.subarray(i * window, (i + 1) * window)),
  );
  const floor = Math.max(...energies) * 1e-4;
  return (energies.findLastIndex((e) => e >= floor) + 1) * 0.05;
}

describe("renderPluck", () => {
  it("returns sampleRate * seconds samples", () => {
    expect(render(220, 1.5)).toHaveLength(SAMPLE_RATE * 1.5);
  });

  it("keeps every sample within [-1, 1], even with a worst-case random source", () => {
    const loud = renderPluck(110, SAMPLE_RATE, 1, () => 1);
    for (const x of [...render(110), ...loud]) {
      expect(Math.abs(x)).toBeLessThanOrEqual(1);
    }
  });

  it("starts audibly and decays", () => {
    const out = render(220);
    const tenth = out.length / 10;
    const first = out.subarray(0, tenth);
    const last = out.subarray(out.length - tenth);
    expect(Math.max(...first.map(Math.abs))).toBeGreaterThan(0.1);
    expect(energy(last)).toBeLessThan(energy(first) / 100);
  });

  it("is deterministic for the same random source", () => {
    expect(render(220)).toEqual(render(220));
  });

  it("higher pitch crosses zero more often in the same window", () => {
    expect(zeroCrossings(sustain(render(880)))).toBeGreaterThan(
      zeroCrossings(sustain(render(220))),
    );
  });

  it.each([110, 300, 700, 1000])("is tuned: %i Hz sounds within 8 cents", (hz) => {
    const measured = estimateFrequency(sustain(render(hz)), SAMPLE_RATE);
    expect(Math.abs(1200 * Math.log2(measured / hz))).toBeLessThan(8);
  });

  it("low strings ring longer than high ones", () => {
    const tail = (xs: Float32Array) => energy(xs.subarray(xs.length / 2)) / energy(xs);
    expect(tail(render(100))).toBeGreaterThan(tail(render(600)));
  });

  it.each([
    [65, 1.5, 2.2],
    [880, 0.8, 1.3],
  ])(
    "a %i Hz pluck (browser sample rate) falls to -40 dB in %f to %f seconds",
    (hz, earliest, latest) => {
      const t = secondsAboveMinus40dB(renderPluck(hz, BROWSER_RATE, 3, seeded(7)), BROWSER_RATE);
      expect(t).toBeGreaterThanOrEqual(earliest);
      expect(t).toBeLessThanOrEqual(latest);
    },
  );
});

describe("renderGuitarPluck", () => {
  it("renders a distinct single-string steel timbre within [-1, 1]", () => {
    const guitar = renderGuitarPluck(220, SAMPLE_RATE, 1, seeded(7));
    const oud = renderPluck(220, SAMPLE_RATE, 1, seeded(7));
    expect(guitar).toHaveLength(SAMPLE_RATE);
    for (const x of guitar) expect(Math.abs(x)).toBeLessThanOrEqual(1);
    expect(guitar).not.toEqual(oud);
  });
});
