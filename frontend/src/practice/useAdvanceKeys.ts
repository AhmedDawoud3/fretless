import { type RefObject, useEffect } from "react";

/** While `active`, Enter or Space calls `advance` (unless the focused Next button already will). */
export function useAdvanceKeys(
  active: boolean,
  advance: () => void,
  nextButton: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      const isKey = event.key === "Enter" || event.key === " ";
      if (!isKey || event.repeat || event.target === nextButton.current) return;
      event.preventDefault();
      advance();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, advance, nextButton]);
}
