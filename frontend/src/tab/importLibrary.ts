import type { ImportedTab, ImportKind } from "../api/client";
import { readStoredList, writeStoredList } from "../app/localStore";

const STORAGE_KEY = "fretless.importLibrary";
const MAX_ITEMS = 50;

export type LibraryItem = {
  key: string;
  imported: ImportedTab;
  sourceUrl?: string;
  sourceFile?: { name: string; size: number };
  isDefault?: boolean;
};

const SESSION_PDFS = new Map<string, string>();
const pdfSessionKey = (name: string, size: number) => `${name.trim().toLowerCase()}:${size}`;

export function cacheSessionPdf(name: string, size: number, base64: string): void {
  SESSION_PDFS.set(pdfSessionKey(name, size), base64);
}

export function getSessionPdf(name: string, size: number): string | null {
  return SESSION_PDFS.get(pdfSessionKey(name, size)) ?? null;
}

const withTrackKey = (base: string, track?: number | null): string =>
  track == null ? base : `${base}#t${track}`;

export const urlLibraryKey = (url: string, kind: ImportKind, track?: number | null): string =>
  withTrackKey(`url:${kind}:${url.trim().toLowerCase()}`, track);

export const pdfLibraryKey = (
  filename: string,
  size: number,
  kind: ImportKind,
  track?: number | null,
): string => withTrackKey(`pdf:v2:${kind}:${filename.trim().toLowerCase()}:${size}`, track);

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

function findTrackEntry(
  items: readonly LibraryItem[],
  directKey: string,
  baseKey: string,
  track?: number | null,
): LibraryItem | undefined {
  const direct = findInLibrary(items, directKey);
  if (direct) return direct;
  const prefix = `${baseKey}#`;
  if (track == null) {
    return items.find((item) => item.isDefault && item.key.startsWith(prefix));
  }
  return items.find((item) => item.key.startsWith(prefix) && item.imported.track_index === track);
}

export function findUrlInLibrary(
  items: readonly LibraryItem[],
  url: string,
  kind: ImportKind,
  track?: number | null,
): LibraryItem | undefined {
  return findTrackEntry(items, urlLibraryKey(url, kind, track), urlLibraryKey(url, kind), track);
}

export function findPdfInLibrary(
  items: readonly LibraryItem[],
  filename: string,
  size: number,
  kind: ImportKind,
  track?: number | null,
): LibraryItem | undefined {
  return findTrackEntry(
    items,
    pdfLibraryKey(filename, size, kind, track),
    pdfLibraryKey(filename, size, kind),
    track,
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

export function savePdfToLibrary(
  items: readonly LibraryItem[],
  imported: ImportedTab,
  filename: string,
  size: number,
  kind: ImportKind,
  isDefault: boolean,
): LibraryItem[] {
  const trackIdx = imported.track_index ?? null;
  const key = pdfLibraryKey(filename, size, kind, trackIdx);
  return saveToLibrary(items, { key, imported, sourceFile: { name: filename, size }, isDefault });
}

export function removeFromLibrary(items: readonly LibraryItem[], key: string): LibraryItem[] {
  const next = items.filter((entry) => entry.key !== key);
  writeStoredList(STORAGE_KEY, next);
  return next;
}
