import { useEffect, useRef, useState } from "react";

/**
 * Runs `load` whenever `key` changes and keeps only the answer for the current key:
 * an answer that arrives late for an old key is dropped. A null key means nothing to load.
 * `value` is null while loading and after a failure; `failed` tells those apart.
 */
export function useRequest<T>(key: string | null, load: () => Promise<T>) {
  const [done, setDone] = useState<{ key: string; value: T | null } | null>(null);
  const latest = useRef(load);
  latest.current = load;

  useEffect(() => {
    if (key === null) return;
    let stale = false;
    const finish = (value: T | null) => !stale && setDone({ key, value });
    latest
      .current()
      .then(finish)
      .catch(() => finish(null));
    return () => {
      stale = true;
    };
  }, [key]);

  const value = done?.key === key ? done.value : null;
  return { value, failed: done?.key === key && value === null };
}
