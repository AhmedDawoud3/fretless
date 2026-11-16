import { describe, expect, it } from "vitest";
import { fftSizeFor } from "./bufferSize";

describe("fftSizeFor", () => {
  it("gives 4096 at the usual browser rates", () => {
    expect(fftSizeFor(44100)).toBe(4096);
    expect(fftSizeFor(48000)).toBe(4096);
  });

  it("grows with the sample rate so 60 Hz still fits four periods", () => {
    expect(fftSizeFor(96000)).toBe(8192);
    expect(fftSizeFor(96000)).toBeGreaterThanOrEqual((4 * 96000) / 60);
  });

  it("stays within the AnalyserNode limits", () => {
    expect(fftSizeFor(8000)).toBeGreaterThanOrEqual(32);
    expect(fftSizeFor(1_000_000)).toBe(32768);
  });
});
