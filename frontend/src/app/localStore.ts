/** Safe typed array persistence helpers backed by `window.localStorage`. */
export function readStoredList<T>(storageKey: string, guard: (value: unknown) => value is T): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(guard) : [];
  } catch {
    return [];
  }
}

export function writeStoredList<T>(storageKey: string, items: readonly T[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(items));
  } catch {
    // Ignore quota or private-browsing failures; in-memory state still works.
  }
}
