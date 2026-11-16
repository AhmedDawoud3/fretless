import { detectPitch } from "./detectPitch";
import { type MicrophoneSession, microphoneAvailable, openMicrophone } from "./openMicrophone";
import { createTracker, type Reading } from "./smoothing";
import { type MicrophoneFailure, statusFromError } from "./statusFromError";

export type ListenResult =
  | { status: "listening"; session: MicrophoneSession }
  | { status: MicrophoneFailure | "cancelled" };

/**
 * Opens the microphone and feeds every frame through detection and smoothing.
 * If `isCancelled()` turns true while the permission prompt is open, the
 * capture is closed again and "cancelled" is returned.
 */
export async function startListening(
  onReading: (reading: Reading) => void,
  isCancelled: () => boolean,
): Promise<ListenResult> {
  if (!microphoneAvailable()) return { status: "unsupported" };
  const tracker = createTracker();
  try {
    const session = await openMicrophone((samples, rate) =>
      onReading(tracker.push(detectPitch(samples, rate), performance.now())),
    );
    if (!isCancelled()) return { status: "listening", session };
    session.close();
    return { status: "cancelled" };
  } catch (error) {
    return { status: statusFromError(error) };
  }
}
