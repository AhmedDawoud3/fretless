import { playTimed } from "../../audio";

/** Seconds from the first note to the second when they are played one after the other. */
const GAP_SECONDS = 0.9;
const RING_SECONDS = 2;

/** Plays the low note then the high one, or both at the same moment. */
export function playInterval(low: number, high: number, together: boolean): void {
  const at = together ? 0 : GAP_SECONDS;
  playTimed(
    [
      { at: 0, steps: [low] },
      { at, steps: [high] },
    ],
    at + RING_SECONDS,
  );
}
