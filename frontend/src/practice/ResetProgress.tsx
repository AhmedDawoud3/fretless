import { useState } from "react";

/** "Reset progress", with a second step so one stray click cannot erase it. */
export function ResetProgress({ onReset }: { onReset: () => void }) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <p className="reset-progress">
        <button type="button" onClick={() => setAsking(true)}>
          Reset progress
        </button>
      </p>
    );
  }
  const confirm = () => {
    onReset();
    setAsking(false);
  };
  return (
    <p className="reset-progress">
      Erase all drill progress? This cannot be undone.{" "}
      <button type="button" onClick={confirm}>
        Yes, reset
      </button>{" "}
      <button type="button" onClick={() => setAsking(false)}>
        Keep it
      </button>
    </p>
  );
}
