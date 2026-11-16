import type { NeckLocation, NeckOut, NoteName } from "../api/client";

export const STEPS_PER_OCTAVE = 24;

/** The note regardless of octave, 0 to 23, C = 0. */
export const pitchClass = (pitch: number): number =>
  ((pitch % STEPS_PER_OCTAVE) + STEPS_PER_OCTAVE) % STEPS_PER_OCTAVE;

export function locationAt(
  neck: NeckOut,
  course: number,
  position: number,
): NeckLocation | undefined {
  return neck.locations.find((l) => l.course === course && l.position === position);
}

/** Where a pitch is nearest the nut (ties go to the higher course), so a learner sees the easy shape. */
export function lowestLocation(neck: NeckOut, pitch: number): NeckLocation | undefined {
  const spots = neck.locations.filter((l) => l.pitch === pitch);
  return spots.reduce<NeckLocation | undefined>(
    (best, l) => (!best || l.position < best.position ? l : best),
    undefined,
  );
}

export function nameOfPitch(neck: NeckOut, pitch: number): NoteName | undefined {
  return neck.locations.find((l) => l.pitch === pitch)?.name;
}

/** The note name regardless of octave (spelled as found on the neck). */
export function nameOfPitchClass(neck: NeckOut, pc: number): NoteName | undefined {
  return neck.locations.find((l) => pitchClass(l.pitch) === pitchClass(pc))?.name;
}
