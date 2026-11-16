import { useEffect, useRef } from "react";

/**
 * Runs `play` once when `question` first appears. A guard instead of a plain effect, because
 * React development mode runs effects twice and the note would sound twice.
 */
export function usePlayOnce<Q>(question: Q, play: () => void): void {
  const played = useRef<Q | null>(null);
  useEffect(() => {
    if (played.current === question) return;
    played.current = question;
    play();
  }, [question, play]);
}
