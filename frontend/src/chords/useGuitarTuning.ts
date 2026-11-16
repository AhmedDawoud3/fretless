import { useEffect, useState } from "react";
import type { GuitarTuning } from "../api/client";
import { loadSettings, saveSettings } from "../explorer/settings";
import { clampCapo, shiftString } from "./shape";

const pitchesOf = (tuning: GuitarTuning | undefined) => tuning?.strings.map((s) => s.pitch) ?? [];

/**
 * The guitar the user plays: open pitch per string (string 1 first) and capo. The one
 * owner of these for every page that asks about a guitar, remembered between visits.
 */
export function useGuitarTuning(presets: readonly GuitarTuning[]) {
  const [saved] = useState(loadSettings);
  const [strings, setStrings] = useState(() => saved.guitarStrings ?? pitchesOf(presets[0]));
  const [capo, setCapo] = useState(saved.guitarCapo);

  useEffect(() => {
    saveSettings({ guitarStrings: strings, guitarCapo: capo });
  }, [strings, capo]);

  return {
    ...{ strings, capo },
    tune: (string: number, semitones: number) =>
      setStrings((s) => shiftString(s, string, semitones)),
    choosePreset: (id: string) => setStrings(pitchesOf(presets.find((p) => p.id === id))),
    setCapo: (value: number) => setCapo(clampCapo(value)),
  };
}

export type GuitarTuningState = ReturnType<typeof useGuitarTuning>;
