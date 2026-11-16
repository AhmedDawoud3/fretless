/** How long the note must stay in tune before it counts, in milliseconds. */
export const HOLD_MS = 500;

/** What the app heard this moment: nothing steady, a note that is not in tune, or one in tune. */
export type Sample = "nothing" | "off" | "in_tune";

/**
 * idle: nothing heard. hearing: a sound, not yet in tune. holding: in tune since `since`.
 * passed: held long enough. `drifts` counts how often a hold was lost.
 */
export type Hold = {
  phase: "idle" | "hearing" | "holding" | "passed";
  since: number;
  drifts: number;
};

export const START_HOLD: Hold = { phase: "idle", since: 0, drifts: 0 };

function lose(hold: Hold, phase: "idle" | "hearing"): Hold {
  return { phase, since: 0, drifts: hold.drifts + (hold.phase === "holding" ? 1 : 0) };
}

/** The next state given what was heard at time `now` (milliseconds). Pure: the caller owns the clock. */
export function holdStep(hold: Hold, sample: Sample, now: number): Hold {
  if (hold.phase === "passed") return hold;
  if (sample === "nothing") return lose(hold, "idle");
  if (sample === "off") return lose(hold, "hearing");
  const since = hold.phase === "holding" ? hold.since : now;
  const phase = now - since >= HOLD_MS ? "passed" : "holding";
  return { ...hold, phase, since };
}
