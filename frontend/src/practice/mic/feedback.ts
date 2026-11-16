import type { Comparison } from "../../listen";

type Context = {
  /** The target is an open course: a flat note is fixed with the peg, not a finger. */
  open?: boolean;
  /** How many octaves the played note is from the target (negative: below). */
  octaves?: number;
};

function octaveWords(octaves: number): string {
  const count = Math.abs(octaves);
  const how = count === 1 ? "an octave" : `${count} octaves`;
  return ` — ${how} ${octaves > 0 ? "higher" : "lower"}, that counts`;
}

/** Far off: say which way to move. A fretted string is shortened to go up, so a flat note goes towards the bridge. */
function farWords(direction: Comparison["direction"], open: boolean): string {
  if (direction === "flat") {
    return open ? "flat — tighten the string (peg up)" : "flat — slide up towards the bridge";
  }
  return open ? "sharp — loosen the string (peg down)" : "sharp — slide back towards the nut";
}

/** What to tell the player about how close the note is, for a note that is the right one. */
export function tunerWords(
  { verdict, direction }: Comparison,
  { open = false, octaves = 0 }: Context = {},
): string {
  const base = {
    in_tune: "in tune",
    close: `a little ${direction}`,
    off: farWords(direction, open),
  }[verdict];
  return octaves === 0 ? base : base + octaveWords(octaves);
}
