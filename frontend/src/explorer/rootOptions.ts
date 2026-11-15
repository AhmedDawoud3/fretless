import type { NeckLocation } from "../api/client";
import { formatNoteName, type NamingSystem } from "../notation/noteName";

const STEPS_PER_OCTAVE = 24;

export type RootOption = { value: number; label: string };

/** All 24 pitch classes, each named (without octave) as the neck spells it. */
export function rootOptions(
  locations: readonly NeckLocation[],
  system: NamingSystem,
): RootOption[] {
  return Array.from({ length: STEPS_PER_OCTAVE }, (_, value) => {
    const found = locations.find((l) => l.pitch % STEPS_PER_OCTAVE === value);
    return { value, label: found ? formatNoteName(found.name, system) : String(value) };
  });
}
