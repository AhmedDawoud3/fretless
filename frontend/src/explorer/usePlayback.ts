import { useRef } from "react";
import { playSequence } from "../audio";
import { useRunner } from "./useRunner";

/** One note of a played sequence: its pitch and where it sits on the neck, if anywhere. */
export type Entry = { pitch: number; location: { course: number; position: number } | null };

function locationAt(entries: readonly Entry[], index: number | null) {
  return entries[index ?? -1]?.location ?? null;
}

/**
 * Plays a sequence of notes and tells which one is sounding. `resetKey` identifies
 * what is being played (maqam, chord, tuning): when it changes, or the page goes
 * away, playback stops.
 */
export function usePlayback(resetKey: string) {
  const { playing, index, begin, stop } = useRunner(resetKey);
  const entries = useRef<readonly Entry[]>([]);

  const start = (notes: readonly Entry[], notesPerMinute: number) => {
    entries.current = notes;
    begin((onNote) =>
      playSequence(
        notes.map((e) => e.pitch),
        notesPerMinute,
        onNote,
      ),
    );
  };

  return { playing, location: locationAt(entries.current, index), start, stop };
}
