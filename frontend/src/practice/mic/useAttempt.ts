import { useCallback, useEffect, useRef, useState } from "react";
import { playSteps } from "../../audio";
import type { Reading } from "../../listen";
import { assess, type Heard, sampleOf } from "./assess";
import type { MicAnswer } from "./check";
import { acceptsReadings, gateAfterReference } from "./gate";
import { type Hold, holdStep, START_HOLD } from "./hold";

const NOTHING: Heard = { kind: "nothing" };
type Attempt = { hold: Hold; heard: Heard };

type AttemptInput = {
  reading: Reading;
  target: number;
  /** False while the question is answered or the tuner is showing: readings are then ignored. */
  enabled: boolean;
  onPass: (answer: MicAnswer) => void;
};

/**
 * Feeds each reading through the hold state machine and reports a pass once. Returns what is
 * heard now and `hearIt`, which plays the target and ignores the microphone while it rings.
 */
export function useAttempt({ reading, target, enabled, onPass }: AttemptInput) {
  const gateUntil = useRef(0);
  const [{ hold, heard }, setAttempt] = useState<Attempt>({ hold: START_HOLD, heard: NOTHING });

  useEffect(() => {
    const now = performance.now();
    const listening = enabled && acceptsReadings(now, gateUntil.current);
    const next = listening ? assess(reading, target) : NOTHING;
    setAttempt((before) => ({ hold: holdStep(before.hold, sampleOf(next), now), heard: next }));
  }, [reading, target, enabled]);

  const reported = useRef(false);
  useEffect(() => {
    if (hold.phase !== "passed" || reported.current || heard.kind !== "tuned") return;
    reported.current = true;
    onPass({ cents: heard.comparison.cents, tries: hold.drifts + 1, octaves: heard.octaves });
  }, [hold, heard, onPass]);

  const hearIt = useCallback(() => {
    gateUntil.current = gateAfterReference(performance.now());
    playSteps(target);
  }, [target]);

  return { heard, hearIt };
}
