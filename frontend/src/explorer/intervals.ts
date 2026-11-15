/** A guitar fret is 2 quarter-tone steps. The one place steps become fret wording. */
export function stepsToFrets(steps: number): string {
  const whole = Math.floor(steps / 2);
  const half = steps % 2 === 1 ? "½" : "";
  const count = `${whole > 0 ? whole : ""}${half}`;
  return `${count} ${steps <= 2 ? "fret" : "frets"}`;
}

export function describeGaps(intervals: readonly number[]): string {
  return intervals.map(stepsToFrets).join(", ");
}
