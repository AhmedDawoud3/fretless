import type { ImportedTab, ImportKind } from "../api/client";
import { readStoredList, writeStoredList } from "../app/localStore";

const STORAGE_KEY = "fretless.importLibrary";
const MAX_ITEMS = 50;

export type LibraryItem = {
  key: string;
  imported: ImportedTab;
  sourceUrl?: string;
  isDefault?: boolean;
};

export const urlLibraryKey = (url: string, kind: ImportKind, track?: number | null): string => {
  const base = `url:${kind}:${url.trim().toLowerCase()}`;
  return track == null ? base : `${base}#t${track}`;
};

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

export function loadLibrary(): LibraryItem[] {
  return readStoredList(STORAGE_KEY, isLibraryItem);
}

export function findInLibrary(items: readonly LibraryItem[], key: string): LibraryItem | undefined {
  return items.find((item) => item.key === key);
}

export function findUrlInLibrary(
  items: readonly LibraryItem[],
  url: string,
  kind: ImportKind,
  track?: number | null,
): LibraryItem | undefined {
  const direct = findInLibrary(items, urlLibraryKey(url, kind, track));
  if (direct) return direct;
  const basePrefix = `${urlLibraryKey(url, kind)}#`;
  if (track == null) {
    return items.find((item) => item.isDefault && item.key.startsWith(basePrefix));
  }
  return items.find(
    (item) => item.key.startsWith(basePrefix) && item.imported.track_index === track,
  );
}

export function saveToLibrary(items: readonly LibraryItem[], item: LibraryItem): LibraryItem[] {
  const next = [item, ...items.filter((entry) => entry.key !== item.key)].slice(0, MAX_ITEMS);
  writeStoredList(STORAGE_KEY, next);
  return next;
}

export function saveUrlToLibrary(
  items: readonly LibraryItem[],
  imported: ImportedTab,
  sourceUrl: string,
  kind: ImportKind,
  isDefault: boolean,
): LibraryItem[] {
  const trackIdx = imported.track_index ?? null;
  const key = urlLibraryKey(sourceUrl, kind, trackIdx);
  return saveToLibrary(items, { key, imported, sourceUrl, isDefault });
}

export function removeFromLibrary(items: readonly LibraryItem[], key: string): LibraryItem[] {
  const next = items.filter((entry) => entry.key !== key);
  writeStoredList(STORAGE_KEY, next);
  return next;
}
