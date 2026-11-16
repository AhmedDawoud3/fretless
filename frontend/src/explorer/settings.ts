import type { TabMode } from "../api/client";
import { CAPO_MAX, PITCH_MAX, PITCH_MIN, STRING_COUNT } from "../chords/shape";
import { NAMING_SYSTEMS, type NamingSystem } from "../notation/noteName";
import { LABEL_MODE_IDS, type LabelMode } from "./readout";
import { DEFAULT_TEMPO, TEMPO_MAX, TEMPO_MIN } from "./tempo";

export const PAGE_IDS = ["maqam", "chords", "tab"] as const;
export type PageId = (typeof PAGE_IDS)[number];

export const TAB_MODE_IDS = ["frets", "names", "both"] as const satisfies readonly TabMode[];
/** The most text the converter API takes. */
export const TAB_TEXT_MAX = 200_000;

export type Settings = {
  page: PageId;
  tuningId: string | null;
  snap: boolean;
  guides: boolean;
  labelMode: LabelMode;
  system: NamingSystem;
  maqamId: string | null;
  /** Pitch class 0..23, or null for the maqam's traditional root. */
  root: number | null;
  tempo: number;
  /** Open pitch of each guitar string, string 1 first, or null for the first preset. */
  guitarStrings: number[] | null;
  guitarCapo: number;
  /** The tab pasted into the converter; "" when none, or too long to be kept. */
  tabText: string;
  tabMode: TabMode;
};

export const DEFAULT_SETTINGS: Settings = {
  page: "maqam",
  tuningId: null,
  snap: true,
  guides: true,
  labelMode: "both",
  system: "letters",
  maqamId: null,
  root: null,
  tempo: DEFAULT_TEMPO,
  guitarStrings: null,
  guitarCapo: 0,
  tabText: "",
  tabMode: "frets",
};

const STORAGE_KEY = "fretless.settings";

type Guard<T> = (value: unknown) => value is T;

const isBoolean: Guard<boolean> = (v): v is boolean => typeof v === "boolean";
const isText: Guard<string | null> = (v): v is string | null => v === null || typeof v === "string";
const isRoot: Guard<number | null> = (v): v is number | null =>
  v === null || (Number.isInteger(v) && (v as number) >= 0 && (v as number) < 24);
const isTempo: Guard<number> = (v): v is number =>
  typeof v === "number" && v >= TEMPO_MIN && v <= TEMPO_MAX;

const isPitch = (v: unknown): v is number =>
  Number.isInteger(v) &&
  (v as number) % 2 === 0 &&
  (v as number) >= PITCH_MIN &&
  (v as number) <= PITCH_MAX;
const isGuitarStrings: Guard<number[] | null> = (v): v is number[] | null =>
  v === null || (Array.isArray(v) && v.length === STRING_COUNT && v.every(isPitch));
const isCapo: Guard<number> = (v): v is number =>
  Number.isInteger(v) && (v as number) >= 0 && (v as number) <= CAPO_MAX;

const isTabText: Guard<string> = (v): v is string =>
  typeof v === "string" && v.length <= TAB_TEXT_MAX;

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
    page: field(s, "page", oneOf(PAGE_IDS), d.page),
    tuningId: field(s, "tuningId", isText, d.tuningId),
    snap: field(s, "snap", isBoolean, d.snap),
    guides: field(s, "guides", isBoolean, d.guides),
    labelMode: field(s, "labelMode", oneOf(LABEL_MODE_IDS), d.labelMode),
    system: field(s, "system", oneOf(NAMING_SYSTEMS), d.system),
    maqamId: field(s, "maqamId", isText, d.maqamId),
    root: field(s, "root", isRoot, d.root),
    tempo: field(s, "tempo", isTempo, d.tempo),
    guitarStrings: field(s, "guitarStrings", isGuitarStrings, d.guitarStrings),
    guitarCapo: field(s, "guitarCapo", isCapo, d.guitarCapo),
    tabText: field(s, "tabText", isTabText, d.tabText),
    tabMode: field(s, "tabMode", oneOf(TAB_MODE_IDS), d.tabMode),
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

/** Each part of the app saves only the settings it owns; the rest stay as stored. */
export function saveSettings(patch: Partial<Settings>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...loadSettings(), ...patch }));
  } catch {
    // Nowhere to save: the settings last for this visit only.
  }
}
