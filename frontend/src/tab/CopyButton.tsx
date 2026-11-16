import { useEffect, useRef, useState } from "react";

const SHOWN_MS = 1500;

/** Copies `text`; says "Copied" for a moment. A clipboard that refuses is not worth an error. */
export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), SHOWN_MS);
  };
  return (
    <button type="button" onClick={copy}>
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
