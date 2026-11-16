import { useCallback, useEffect, useRef, useState } from "react";
import type { MicrophoneSession } from "./openMicrophone";
import type { Reading } from "./smoothing";
import { startListening } from "./startListening";

export type MicrophoneStatus =
  | "idle"
  | "requesting"
  | "listening"
  | "denied"
  | "unsupported"
  | "error";

const SILENT: Reading = { state: "silent" };

/**
 * Listens to the microphone and exposes a smoothed pitch reading.
 * `start` must be called from a user gesture (a button click).
 */
export function useMicrophone(): {
  status: MicrophoneStatus;
  reading: Reading;
  start(): Promise<void>;
  stop(): void;
} {
  const [status, setStatus] = useState<MicrophoneStatus>("idle");
  const [reading, setReading] = useState<Reading>(SILENT);
  const session = useRef<MicrophoneSession | null>(null);
  /** Bumped by stop() so a start() still waiting on the permission prompt can tell it was cancelled. */
  const generation = useRef(0);

  const stop = useCallback(() => {
    generation.current++;
    session.current?.close();
    session.current = null;
    setStatus((s) => (s === "listening" || s === "requesting" ? "idle" : s));
    setReading(SILENT);
  }, []);

  const start = useCallback(async () => {
    if (session.current) return;
    const mine = ++generation.current;
    setStatus("requesting");
    const result = await startListening(setReading, () => mine !== generation.current);
    if (result.status === "cancelled") return;
    if (result.status === "listening") session.current = result.session;
    setStatus(result.status);
  }, []);

  useEffect(() => stop, [stop]);

  return { status, reading, start, stop };
}
