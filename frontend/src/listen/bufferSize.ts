import { MIN_HZ } from "./detectPitch";

const MIN_PERIODS = 4;
const MIN_FFT = 32;
const MAX_FFT = 32768;

/** Smallest power-of-two AnalyserNode size holding four periods of the lowest detectable pitch. */
export function fftSizeFor(sampleRate: number): number {
  const needed = Math.ceil((MIN_PERIODS * sampleRate) / MIN_HZ);
  const size = 2 ** Math.ceil(Math.log2(needed));
  return Math.min(MAX_FFT, Math.max(MIN_FFT, size));
}
