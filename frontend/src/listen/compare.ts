export const CENTS_PER_STEP = 50;
export const IN_TUNE_CENTS = 15;
export const CLOSE_CENTS = 35;
/** Beyond this the player is nearer another quarter-tone neighbour than a mis-intoned target. */
export const WRONG_NOTE_CENTS = 75;
const STEPS_PER_OCTAVE = 24;

export type Verdict = "in_tune" | "close" | "off";
export type Direction = "flat" | "sharp" | "none";
export type Comparison = {
  cents: number;
  verdict: Verdict;
  direction: Direction;
  wrongNote: boolean;
};

/** Folds a step difference into [-12, 12] so any octave of the target counts. */
function foldOctave(diff: number): number {
  return diff - STEPS_PER_OCTAVE * Math.round(diff / STEPS_PER_OCTAVE);
}

function verdictFor(absCents: number): Verdict {
  if (absCents <= IN_TUNE_CENTS) return "in_tune";
  return absCents <= CLOSE_CENTS ? "close" : "off";
}

function directionFor(cents: number): Direction {
  if (cents === 0) return "none";
  return cents > 0 ? "sharp" : "flat";
}

/** How far a played pitch is from the target, in cents (50 per step). */
export function compareToTarget(
  steps: number,
  targetSteps: number,
  options: { octaveTolerant?: boolean } = {},
): Comparison {
  const diff = steps - targetSteps;
  const cents = (options.octaveTolerant ? foldOctave(diff) : diff) * CENTS_PER_STEP;
  return {
    cents,
    verdict: verdictFor(Math.abs(cents)),
    direction: directionFor(cents),
    wrongNote: Math.abs(cents) > WRONG_NOTE_CENTS,
  };
}

/** The closest whole step and the signed cents from it. */
export function nearestStep(steps: number): { step: number; cents: number } {
  const step = Math.round(steps);
  return { step, cents: (steps - step) * CENTS_PER_STEP };
}
