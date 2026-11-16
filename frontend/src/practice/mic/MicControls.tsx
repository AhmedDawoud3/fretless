import type { MicrophoneStatus } from "../../listen";
import { micProblem } from "./micMessages";

type MicControlsProps = { status: MicrophoneStatus; onStart: () => void; onStop: () => void };

/** Start and stop the microphone, say whether it is listening, and say what is wrong if it is not. */
export function MicControls({ status, onStart, onStop }: MicControlsProps) {
  const problem = micProblem(status);
  return (
    <div className="mic-controls">
      {status === "listening" ? (
        <>
          <span className="mic-listening">
            <span className="mic-dot" aria-hidden="true" />
            Listening
          </span>
          <button type="button" onClick={onStop}>
            Stop
          </button>
        </>
      ) : (
        <button type="button" disabled={status === "requesting"} onClick={onStart}>
          {status === "requesting" ? "Waiting for permission..." : "Start listening"}
        </button>
      )}
      <small>
        Nothing is recorded or sent anywhere: the sound is analysed here and thrown away.
      </small>
      {problem && <p role="alert">{problem}</p>}
    </div>
  );
}
