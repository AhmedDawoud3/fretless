import { NAMING_SYSTEMS, type NamingSystem } from "../notation/noteName";
import { LABEL_MODE_IDS, type LabelMode } from "./readout";
import { DEFAULT_TEMPO, TEMPO_MAX, TEMPO_MIN } from "./tempo";

export type Settings = {
  tuningId: string | null;
  snap: boolean;
  guides: boolean;
  labelMode: LabelMode;
  system: NamingSystem;
  maqamId: string | null;
  /** Pitch class 0..23, or null for the maqam's traditional root. */
  root: number | null;
  tempo: number;
};

export const DEFAULT_SETTINGS: Settings = {
  tuningId: null,
  snap: true,
  guides: true,
  labelMode: "both",
  system: "letters",
  maqamId: null,
  root: null,
  tempo: DEFAULT_TEMPO,
};

const STORAGE_KEY = "fretless.settings";

type Guard<T> = (value: unknown) => value is T;

const isBoolean: Guard<boolean> = (v): v is boolean => typeof v === "boolean";
const isText: Guard<string | null> = (v): v is string | null => v === null || typeof v === "string";
const isRoot: Guard<number | null> = (v): v is number | null =>
  v === null || (Number.isInteger(v) && (v as number) >= 0 && (v as number) < 24);
const isTempo: Guard<number> = (v): v is number =>
  typeof v === "number" && v >= TEMPO_MIN && v <= TEMPO_MAX;

function oneOf<T extends string>(allowed: readonly T[]): Guard<T> {
  return (v): v is T => allowed.some((a) => a === v);
}

function field<T>(source: Record<string, unknown>, key: string, ok: Guard<T>, fallback: T): T {
  const value = source[key];
  return ok(value) ? value : fallback;
}

/** Stored settings are outside data: anything unknown or garbled falls back to its default. */
export function parseSettings(raw: string | null): Settings {
  let source: unknown = null;
  try {
    source = raw === null ? null : JSON.parse(raw);
  } catch {
    source = null;
  }
  if (typeof source !== "object" || source === null || Array.isArray(source)) {
    return DEFAULT_SETTINGS;
  }
  const d = DEFAULT_SETTINGS;
  const s = source as Record<string, unknown>;
  return {
    tuningId: field(s, "tuningId", isText, d.tuningId),
    snap: field(s, "snap", isBoolean, d.snap),
    guides: field(s, "guides", isBoolean, d.guides),
    labelMode: field(s, "labelMode", oneOf(LABEL_MODE_IDS), d.labelMode),
    system: field(s, "system", oneOf(NAMING_SYSTEMS), d.system),
    maqamId: field(s, "maqamId", isText, d.maqamId),
    root: field(s, "root", isRoot, d.root),
    tempo: field(s, "tempo", isTempo, d.tempo),
  };
}

/** Read once on load. Storage can be missing or throw (private windows), so never let it break the page. */
export function loadSettings(): Settings {
  try {
    return parseSettings(localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Nowhere to save: the settings last for this visit only.
  }
}
