/** One fret number per string, string 1 (highest) first. 0 is open, null is muted. */
export type Frets = readonly (number | null)[];

export const STRING_COUNT = 6;
export const FRET_COUNT = 12;
export const CAPO_MAX = 12;
/** The open pitches the API accepts, in steps. */
export const PITCH_MIN = 24;
export const PITCH_MAX = 144;
/** A guitar fret, and so a tuning peg turn, is a semitone: two steps. */
export const SEMITONE = 2;

export const openShape = (): Frets => Array.from({ length: STRING_COUNT }, () => 0);

const replaceAt = <T>(items: readonly T[], string: number, value: T): T[] =>
  items.map((item, i) => (i === string - 1 ? value : item));

/** Puts a finger on `fret` of `string` (1 is the highest); the same spot again lifts it. */
export function pressFret(frets: Frets, string: number, fret: number): Frets {
  return replaceAt(frets, string, frets[string - 1] === fret ? 0 : fret);
}

/** The control at the nut: an open string is muted, anything else becomes open. */
export function cycleNut(frets: Frets, string: number): Frets {
  const muted = frets[string - 1] === null;
  return replaceAt(frets, string, muted ? 0 : null);
}

/** Moves one string's open pitch by `semitones`, never past what the API accepts. */
export function shiftString(strings: readonly number[], string: number, semitones: number) {
  const moved = (strings[string - 1] ?? 0) + semitones * SEMITONE;
  return replaceAt(strings, string, Math.min(PITCH_MAX, Math.max(PITCH_MIN, moved)));
}

export function clampCapo(value: number): number {
  return Number.isNaN(value) ? 0 : Math.min(CAPO_MAX, Math.max(0, Math.round(value)));
}

/** Pitch in steps of a string with this open pitch, under a capo, held at `fret` (counted from the capo). */
export const soundingPitch = (open: number, capo: number, fret: number): number =>
  open + (capo + fret) * SEMITONE;
