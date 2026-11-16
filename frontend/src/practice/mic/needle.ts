import { IN_TUNE_CENTS } from "../../listen/compare";

/** The meter runs from -50 to +50 cents: half a step either way, the whole way to the next note. */
const RANGE_CENTS = 50;

/** Where the needle sits along the meter, 0 (far flat) to 100 (far sharp); it stops at the ends. */
export function needlePercent(cents: number): number {
  const clamped = Math.max(-RANGE_CENTS, Math.min(RANGE_CENTS, cents));
  return ((clamped + RANGE_CENTS) / (2 * RANGE_CENTS)) * 100;
}

/** The green stripe for "in tune", as percents of the meter. */
export const GREEN_ZONE = {
  left: needlePercent(-IN_TUNE_CENTS),
  width: needlePercent(IN_TUNE_CENTS) - needlePercent(-IN_TUNE_CENTS),
};
