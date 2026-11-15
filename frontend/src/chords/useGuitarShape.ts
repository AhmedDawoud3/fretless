import { useState } from "react";
import type { GuitarTuning } from "../api/client";
import { clampCapo, cycleNut, type Frets, openShape, pressFret, shiftString } from "./shape";

const pitchesOf = (tuning: GuitarTuning | undefined) => tuning?.strings.map((s) => s.pitch) ?? [];

/** The shape being entered: open pitch per string, capo, and finger per string (all string 1 first). */
export function useGuitarShape(presets: readonly GuitarTuning[]) {
  const [strings, setStrings] = useState(() => pitchesOf(presets[0]));
  const [capo, setCapo] = useState(0);
  const [frets, setFrets] = useState<Frets>(openShape);
  return {
    ...{ strings, capo, frets },
    press: (string: number, fret: number) => setFrets((f) => pressFret(f, string, fret)),
    nut: (string: number) => setFrets((f) => cycleNut(f, string)),
    tune: (string: number, semitones: number) =>
      setStrings((s) => shiftString(s, string, semitones)),
    choosePreset: (id: string) => setStrings(pitchesOf(presets.find((p) => p.id === id))),
    setCapo: (value: number) => setCapo(clampCapo(value)),
    clear: () => setFrets(openShape()),
  };
}

export type GuitarShape = ReturnType<typeof useGuitarShape>;
