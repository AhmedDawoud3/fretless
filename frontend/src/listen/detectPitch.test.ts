import { describe, expect, it } from "vitest";
import { renderPluck } from "../audio/pluck";
import { detectPitch } from "./detectPitch";
import {
  add,
  centsBetween,
  harmonicTone,
  seeded,
  sine,
  whiteNoise,
  withNoise,
} from "./testSignals";

const N = 4096;
const RATES = [44100, 48000];
const WEAK_FUNDAMENTAL = [0.2, 1.0, 0.7, 0.5];
const RICH = [1, 0.5, 0.3, 0.2];

function expectPitch(
  frame: Float32Array,
  rate: number,
  expectedHz: number,
  toleranceCents: number,
) {
  const found = detectPitch(frame, rate);
  expect(found).not.toBeNull();
  expect(Math.abs(centsBetween(found?.frequency ?? 0, expectedHz))).toBeLessThanOrEqual(
    toleranceCents,
  );
}

describe("detectPitch on pure sines", () => {
  for (const rate of RATES) {
    for (const f of [65.41, 110, 196, 261.63, 440, 880]) {
      it(`finds ${f} Hz at ${rate} Hz sampling`, () => {
        expectPitch(sine(f, rate, N), rate, f, 5);
      });
    }
  }

  it("reports high clarity for a clean tone", () => {
    expect(detectPitch(sine(220, 44100, N), 44100)?.clarity).toBeGreaterThan(0.95);
  });
});

describe("detectPitch on oud-like signals", () => {
  for (const f of [98, 147]) {
    it(`keeps the octave when the ${f} Hz fundamental is weak`, () => {
      expectPitch(harmonicTone(f, WEAK_FUNDAMENTAL, 44100, N), 44100, f, 5);
    });
  }

  it("reads a two-string course 4 cents apart as their mean", () => {
    const f = 220;
    const sharp = harmonicTone(f * 2 ** (2 / 1200), RICH, 44100, N);
    const flat = harmonicTone(f / 2 ** (2 / 1200), RICH, 44100, N);
    expectPitch(add(sharp, flat), 44100, f, 6);
  });

  it("survives white noise at -20 dB", () => {
    for (const f of [98, 196, 440]) {
      const noisy = withNoise(harmonicTone(f, RICH, 44100, N), -20, seeded(3));
      expectPitch(noisy, 44100, f, 10);
    }
  });

  it("still detects a decaying tone", () => {
    expectPitch(harmonicTone(196, RICH, 44100, N, 0.15), 44100, 196, 5);
  });
});

describe("detectPitch on non-pitched frames", () => {
  it("returns null for silence", () => {
    expect(detectPitch(new Float32Array(N), 44100)).toBeNull();
  });

  it("returns null for a very quiet tone", () => {
    expect(
      detectPitch(
        sine(220, 44100, N).map((x) => x * 0.001),
        44100,
      ),
    ).toBeNull();
  });

  it("returns null for pure noise", () => {
    expect(detectPitch(whiteNoise(0.3, N, seeded(11)), 44100)).toBeNull();
  });
});

describe("detectPitch on the Karplus-Strong pluck", () => {
  const rate = 44100;
  const skip = Math.round(rate * 0.05);

  for (const f of [65.41, 98, 146.83, 220, 329.63, 440, 659.26, 1000]) {
    it(`finds a ${f} Hz pluck within 15 cents`, () => {
      const pluck = renderPluck(f, rate, 0.5, seeded(5)).subarray(skip, skip + N);
      const found = detectPitch(pluck, rate);
      expect(found).not.toBeNull();
      const error = Math.abs(centsBetween(found?.frequency ?? 0, f));
      console.info(`pluck ${f} Hz: ${error.toFixed(2)} cents off`);
      expect(error).toBeLessThanOrEqual(15);
    });
  }
});

describe("detectPitch speed", () => {
  it("takes well under 10 ms per 4096-sample frame", () => {
    const frame = harmonicTone(98, WEAK_FUNDAMENTAL, 44100, N);
    detectPitch(frame, 44100);
    const start = performance.now();
    for (let i = 0; i < 50; i++) detectPitch(frame, 44100);
    const perFrame = (performance.now() - start) / 50;
    console.info(`detectPitch: ${perFrame.toFixed(2)} ms per frame`);
    expect(perFrame).toBeLessThan(10);
  });
});
