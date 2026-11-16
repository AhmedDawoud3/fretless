/** Pitch in fractional steps (quarter tones above C0; A4 = 114) of a frequency in Hz. Inverse of `stepsToFrequency`. */
export function frequencyToSteps(hz: number): number {
  return 114 + 24 * Math.log2(hz / 440);
}
