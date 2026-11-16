import { useEffect } from "react";

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLInputElement ||
  target instanceof HTMLSelectElement ||
  target instanceof HTMLTextAreaElement;

/** The place 0 to 8 a key 1 to 9 stands for, or null for any other key, a held modifier or a place past `count`. */
export function placeForKey(event: KeyboardEvent, count: number): number | null {
  const modified = event.ctrlKey || event.metaKey || event.altKey;
  if (modified || !/^[1-9]$/.test(event.key)) return null;
  const place = Number(event.key) - 1;
  return place < count ? place : null;
}

/** While `active`, the keys 1 to 9 call `choose` with the place of the option. */
export function useOptionKeys(
  active: boolean,
  count: number,
  choose: (place: number) => void,
): void {
  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      const place = isTyping(event.target) ? null : placeForKey(event, count);
      if (place !== null) choose(place);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, count, choose]);
}
