import { useCallback, useEffect, useRef, useState } from "react";
import type { Run } from "../audio";

/**
 * Keeps track of one run of sound: whether it is playing and which event is sounding.
 * `resetKey` identifies what is being played: when it changes, or the page goes away,
 * the run stops. `begin` starts a run, given a function that launches it and reports
 * the index of each event as it starts.
 */
export function useRunner(resetKey: string) {
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState<number | null>(null);
  const run = useRef<Run | null>(null);

  const stop = useCallback(() => {
    run.current?.stop();
    run.current = null;
    setPlaying(false);
    setIndex(null);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: resetKey is the trigger, not a value used here
  useEffect(() => stop, [stop, resetKey]);

  const begin = (launch: (onIndex: (index: number) => void) => Run) => {
    const started = launch(setIndex);
    run.current = started;
    setPlaying(true);
    void started.done.then(() => run.current === started && stop());
  };

  return { playing, index, begin, stop };
}
