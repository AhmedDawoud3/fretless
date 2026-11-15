import { useCallback, useEffect, useRef, useState } from "react";

const VIBRATION_MS = 700;

/** Which course is vibrating; the key changes on every pluck so the animation restarts. */
export function useVibration() {
  const [state, setState] = useState<{ course: number; key: number } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const counter = useRef(0);

  const pluck = useCallback((course: number) => {
    counter.current += 1;
    setState({ course, key: counter.current });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState(null), VIBRATION_MS);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  return { vibrating: state, pluck };
}
