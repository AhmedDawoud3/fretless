import { playTimed } from "../../audio";

/** Seconds from the reference to the target. */
const GAP_SECONDS = 1;
const RING_SECONDS = 2;

/** Plays the reference, then the target a moment later. */
export function playEcho(reference: number, target: number): void {
  playTimed(
    [
      { at: 0, steps: [reference] },
      { at: GAP_SECONDS, steps: [target] },
    ],
    GAP_SECONDS + RING_SECONDS,
  );
}
