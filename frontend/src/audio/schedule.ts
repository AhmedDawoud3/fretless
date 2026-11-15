/** Start time in seconds of each of `count` evenly spaced notes, one per beat. */
export function noteStartTimes(count: number, notesPerMinute: number): number[] {
  return Array.from({ length: count }, (_, i) => (i * 60) / notesPerMinute);
}
