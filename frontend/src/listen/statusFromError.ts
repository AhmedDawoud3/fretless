export type MicrophoneFailure = "denied" | "unsupported" | "error";

/** Maps what getUserMedia (or the AudioContext) threw to a status the page can show. */
export function statusFromError(error: unknown): MicrophoneFailure {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "denied";
  if (name === "NotFoundError" || name === "TypeError") return "unsupported";
  return "error";
}
