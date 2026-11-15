import { useCallback, useEffect, useRef, useState } from "react";
import type { Scale } from "../api/client";
import { playSequence } from "../audio";
import { roundTrip } from "./roundTrip";

type Run = ReturnType<typeof playSequence>;
type Entry = Scale["playback"][number];

/**
 * Plays the scale up and down. `resetKey` identifies what is being played (maqam,
 * root, tuning): when it changes, or the page goes away, playback stops.
 */
export function usePlayback(scale: Scale | null, tempo: number, resetKey: string) {
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState<number | null>(null);
  const run = useRef<Run | null>(null);
  const entries = useRef<Entry[]>([]);

  const stop = useCallback(() => {
    run.current?.stop();
    run.current = null;
    setPlaying(false);
    setIndex(null);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: resetKey is the trigger, not a value used here
  useEffect(() => stop, [stop, resetKey]);

  const start = () => {
    if (!scale) return;
    entries.current = roundTrip(scale.playback);
    const started = playSequence(
      entries.current.map((e) => e.pitch),
      tempo,
      setIndex,
    );
    run.current = started;
    setPlaying(true);
    void started.done.then(() => {
      if (run.current === started) stop();
    });
  };

  const entry = index === null ? undefined : entries.current[index];
  return { playing, location: entry?.location ?? null, toggle: playing ? stop : start };
}
