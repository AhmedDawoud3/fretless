import type { AudioArrangement, Converted, TabMode } from "../api/client";
import { readStoredList, writeStoredList } from "../app/localStore";

const STORAGE_KEY = "fretless.audioLibrary";
const MAX_AUDIO_ITEMS = 15;
const sessionStemBlobs = new Map<string, AudioArrangement[]>();

export type AudioLibraryEntry = {
  key: string;
  filename: string;
  tuningId: string;
  mode: TabMode;
  converted: Converted;
};

export const audioLibraryKey = (
  filename: string,
  size: number,
  tuningId: string,
  mode: TabMode,
): string => `audio:${tuningId}:${mode}:${filename.trim().toLowerCase()}:${size}`;

function stripStemBlobs(converted: Converted): Converted {
  if (converted.arrangements.length === 0) return converted;
  return {
    ...converted,
    arrangements: converted.arrangements.map((arr) => ({ ...arr, audio_base64: null })),
  };
}

function rehydrateEntry(entry: AudioLibraryEntry): AudioLibraryEntry {
  const blobs = sessionStemBlobs.get(entry.key);
  if (!blobs) return entry;
  return {
    ...entry,
    converted: { ...entry.converted, arrangements: blobs },
  };
}

function isAudioEntry(value: unknown): value is AudioLibraryEntry {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<AudioLibraryEntry>;
  return (
    typeof candidate.key === "string" &&
    typeof candidate.filename === "string" &&
    typeof candidate.converted === "object" &&
    candidate.converted !== null &&
    typeof candidate.converted.text === "string"
  );
}

function persistEntries(items: readonly AudioLibraryEntry[]): void {
  writeStoredList(
    STORAGE_KEY,
    items.map((item) => ({ ...item, converted: stripStemBlobs(item.converted) })),
  );
}

export function loadAudioLibrary(): AudioLibraryEntry[] {
  return readStoredList(STORAGE_KEY, isAudioEntry).map(rehydrateEntry);
}

export function findAudioInLibrary(
  items: readonly AudioLibraryEntry[],
  key: string,
): AudioLibraryEntry | undefined {
  const hit = items.find((entry) => entry.key === key);
  return hit ? rehydrateEntry(hit) : undefined;
}

export function saveAudioToLibrary(
  items: readonly AudioLibraryEntry[],
  entry: AudioLibraryEntry,
): AudioLibraryEntry[] {
  if (entry.converted.arrangements.length > 0) {
    sessionStemBlobs.set(entry.key, entry.converted.arrangements);
  }
  const next = [entry, ...items.filter((e) => e.key !== entry.key)].slice(0, MAX_AUDIO_ITEMS);
  persistEntries(next);
  return next.map(rehydrateEntry);
}

export function removeAudioFromLibrary(
  items: readonly AudioLibraryEntry[],
  key: string,
): AudioLibraryEntry[] {
  sessionStemBlobs.delete(key);
  const next = items.filter((entry) => entry.key !== key);
  persistEntries(next);
  return next;
}
