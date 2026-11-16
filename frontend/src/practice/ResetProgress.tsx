import { useState } from "react";

type ResetProgressProps = {
  onReset: () => void;
  label?: string;
  prompt?: string;
};

/** "Reset progress", with a second step so one stray click cannot erase it. */
export function ResetProgress({
  onReset,
  label = "Reset progress",
  prompt = "Erase all drill progress? This cannot be undone.",
}: ResetProgressProps) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <p className="reset-progress">
        <button type="button" onClick={() => setAsking(true)}>
          {label}
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
      {prompt}{" "}
      <button type="button" onClick={confirm}>
        Yes, reset
      </button>{" "}
      <button type="button" onClick={() => setAsking(false)}>
        Keep it
      </button>
    </p>
  );
}
