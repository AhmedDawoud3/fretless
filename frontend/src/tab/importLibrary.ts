import type { ImportedTab, ImportKind } from "../api/client";

const STORAGE_KEY = "fretless.importLibrary";
const MAX_ITEMS = 50;

export type LibraryItem = {
  key: string;
  imported: ImportedTab;
};

export const urlLibraryKey = (url: string, kind: ImportKind): string =>
  `url:${kind}:${url.trim().toLowerCase()}`;

export const pdfLibraryKey = (filename: string, size: number, kind: ImportKind): string =>
  `pdf:${kind}:${filename.trim().toLowerCase()}:${size}`;

function isLibraryItem(value: unknown): value is LibraryItem {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { key?: unknown; imported?: unknown };
  if (typeof candidate.key !== "string" || typeof candidate.imported !== "object") return false;
  if (candidate.imported === null) return false;
  const imported = candidate.imported as { title?: unknown; text?: unknown };
  return typeof imported.title === "string" && typeof imported.text === "string";
}

function writeLibrary(items: readonly LibraryItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore quota/private-mode storage errors; in-memory state still works.
  }
}

export function loadLibrary(): LibraryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isLibraryItem) : [];
  } catch {
    return [];
  }
}

export function findInLibrary(items: readonly LibraryItem[], key: string): LibraryItem | undefined {
  return items.find((item) => item.key === key);
}

export function saveToLibrary(items: readonly LibraryItem[], item: LibraryItem): LibraryItem[] {
  const next = [item, ...items.filter((entry) => entry.key !== item.key)].slice(0, MAX_ITEMS);
  writeLibrary(next);
  return next;
}

export function removeFromLibrary(items: readonly LibraryItem[], key: string): LibraryItem[] {
  const next = items.filter((entry) => entry.key !== key);
  writeLibrary(next);
  return next;
}
