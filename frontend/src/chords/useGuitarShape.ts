import { useState } from "react";
import type { GuitarTuning } from "../api/client";
import { cycleNut, type Frets, openShape, pressFret } from "./shape";
import { useGuitarTuning } from "./useGuitarTuning";

/** The shape being entered: the guitar's tuning and capo, and a finger per string (string 1 first). */
export function useGuitarShape(presets: readonly GuitarTuning[]) {
  const tuning = useGuitarTuning(presets);
  const [frets, setFrets] = useState<Frets>(openShape);
  return {
    ...tuning,
    frets,
    press: (string: number, fret: number) => setFrets((f) => pressFret(f, string, fret)),
    nut: (string: number) => setFrets((f) => cycleNut(f, string)),
    clear: () => setFrets(openShape()),
  };
}

export type GuitarShape = ReturnType<typeof useGuitarShape>;
