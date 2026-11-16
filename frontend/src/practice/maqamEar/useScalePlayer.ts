import { useCallback, useEffect, useRef } from "react";
import type { Scale } from "../../api/client";
import { playSequence, type Run } from "../../audio";
import { roundTrip } from "../../explorer/roundTrip";

/** Notes per minute: the normal pace of the drill and the slow replay. */
export const NORMAL_TEMPO = 120;
export const SLOW_TEMPO = 70;

/** A function that plays the scale up and back down at a tempo, stopping any earlier run; silent on unmount. */
export function useScalePlayer(scale: Scale | null): (notesPerMinute: number) => void {
  const run = useRef<Run | null>(null);
  useEffect(() => () => run.current?.stop(), []);
  return useCallback(
    (notesPerMinute) => {
      if (!scale) return;
      run.current?.stop();
      run.current = playSequence(roundTrip(scale.playback.map((e) => e.pitch)), notesPerMinute);
    },
    [scale],
  );
}
