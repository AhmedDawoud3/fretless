import type { MicrophoneStatus } from "../../listen";

/** What to tell the player when the microphone did not start; null when there is nothing wrong. */
export function micProblem(status: MicrophoneStatus): string | null {
  switch (status) {
    case "denied":
      return "The microphone is blocked. Allow it in the browser: click the icon beside the address, set Microphone to Allow, then press Start listening again.";
    case "unsupported":
      return "This browser cannot use the microphone here. The microphone needs a secure page: open the app at localhost or https.";
    case "error":
      return "The microphone could not be opened. Check that one is connected and no other program is using it, then try again.";
    default:
      return null;
  }
}
