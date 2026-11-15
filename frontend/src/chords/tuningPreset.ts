import type { GuitarTuning } from "../api/client";

export const CUSTOM = "custom";

/** The preset whose open pitches equal `strings` (string 1 first), or "custom". */
export function presetIdFor(strings: readonly number[], presets: readonly GuitarTuning[]): string {
  const same = (p: GuitarTuning) =>
    p.strings.length === strings.length && p.strings.every((s, i) => s.pitch === strings[i]);
  return presets.find(same)?.id ?? CUSTOM;
}
