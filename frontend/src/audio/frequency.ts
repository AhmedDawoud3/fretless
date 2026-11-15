/** Frequency in Hz of a pitch in steps (quarter tones above C0; A4 = 114 = 440 Hz). */
export function stepsToFrequency(steps: number): number {
  return 440 * 2 ** ((steps - 114) / 24);
}
