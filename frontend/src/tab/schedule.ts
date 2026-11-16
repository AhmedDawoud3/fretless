export const STEPS_PER_OCTAVE = 24;
/** Characters of tab between two notes written one after another: `--0--`. */
const TICKS_PER_NOTE = 3;
/** The longest silence kept, in ticks: a system break or a long empty stretch should not stall. */
export const MAX_GAP_TICKS = 16;

/** Seconds one character of tab lasts at a speed given in notes per minute. */
export const secondsPerTick = (notesPerMinute: number): number =>
  60 / (notesPerMinute * TICKS_PER_NOTE);

/** Start time in seconds of each event, from the gaps between their ticks (each gap at most `maxGap`). */
export function eventStartSeconds(
  ticks: readonly number[],
  perTick: number,
  maxGap: number = MAX_GAP_TICKS,
): number[] {
  const starts: number[] = [];
  let now = 0;
  ticks.forEach((tick, i) => {
    const gap = i === 0 ? 0 : Math.min(maxGap, Math.max(0, tick - (ticks[i - 1] ?? tick)));
    now += gap * perTick;
    starts.push(now);
  });
  return starts;
}
