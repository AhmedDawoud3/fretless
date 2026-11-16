import { useCallback, useEffect, useRef } from "react";
import { playSteps } from "../../audio";
import type { Reading } from "../../listen";
import { assess, type Heard, sampleOf } from "./assess";
import type { MicAnswer } from "./check";
import { acceptsReadings, gateAfterReference } from "./gate";
import { holdStep, START_HOLD } from "./hold";

const NOTHING: Heard = { kind: "nothing" };

type AttemptInput = {
  reading: Reading;
  target: number;
  /** False while the question is answered or the tuner is showing: readings are then ignored. */
  enabled: boolean;
  onPass: (answer: MicAnswer) => void;
};

/**
 * What is heard now, and `hearIt`, which plays the target and ignores the microphone while it
 * rings. Every reading goes through the hold state machine, which lives in a ref: readings arrive
 * about sixty times a second, and keeping the hold in state would render twice per reading.
 * Reports a pass once.
 */
export function useAttempt({ reading, target, enabled, onPass }: AttemptInput) {
  const gateUntil = useRef(0);
  const hold = useRef(START_HOLD);
  const reported = useRef(false);
  const now = performance.now();
  const heard =
    enabled && acceptsReadings(now, gateUntil.current) ? assess(reading, target) : NOTHING;

  useEffect(() => {
    hold.current = holdStep(hold.current, sampleOf(heard), now);
    if (hold.current.phase !== "passed" || reported.current || heard.kind !== "tuned") return;
    reported.current = true;
    const { cents } = heard.comparison;
    onPass({ cents, tries: hold.current.drifts + 1, octaves: heard.octaves });
  }, [heard, now, onPass]);

  const hearIt = useCallback(() => {
    gateUntil.current = gateAfterReference(performance.now());
    playSteps(target);
  }, [target]);

  return { heard, hearIt };
}
