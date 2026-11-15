import { useCallback, useEffect, useRef, useState } from "react";
import type { Scale } from "../api/client";
import { playSequence } from "../audio";

type Run = ReturnType<typeof playSequence>;
/** One note of a played sequence: its pitch and where it sits on the neck, if anywhere. */
export type Entry = Scale["playback"][number];

function locationAt(entries: readonly Entry[], index: number | null) {
  return entries[index ?? -1]?.location ?? null;
}

/**
 * Plays a sequence of notes and tells which one is sounding. `resetKey` identifies
 * what is being played (maqam, chord, tuning): when it changes, or the page goes
 * away, playback stops.
 */
export function usePlayback(resetKey: string) {
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState<number | null>(null);
  const run = useRef<Run | null>(null);
  const entries = useRef<readonly Entry[]>([]);

  const stop = useCallback(() => {
    run.current?.stop();
    run.current = null;
    setPlaying(false);
    setIndex(null);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: resetKey is the trigger, not a value used here
  useEffect(() => stop, [stop, resetKey]);

  const start = (notes: readonly Entry[], notesPerMinute: number) => {
    entries.current = notes;
    const started = playSequence(
      notes.map((e) => e.pitch),
      notesPerMinute,
      setIndex,
    );
    run.current = started;
    setPlaying(true);
    void started.done.then(() => run.current === started && stop());
  };

  return { playing, location: locationAt(entries.current, index), start, stop };
}
