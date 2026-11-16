import { useEffect } from "react";

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLInputElement ||
  target instanceof HTMLSelectElement ||
  target instanceof HTMLTextAreaElement;

/** While `active`, the keys 1 to 9 call `choose` with the place 0 to 8; a place beyond `count` is ignored. */
export function useOptionKeys(
  active: boolean,
  count: number,
  choose: (place: number) => void,
): void {
  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      const place = Number(event.key) - 1;
      const modified = event.ctrlKey || event.metaKey || event.altKey;
      if (!/^[1-9]$/.test(event.key) || modified || isTyping(event.target) || place >= count)
        return;
      choose(place);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, count, choose]);
}
