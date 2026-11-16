import { expect, test } from "vitest";
import { DEFAULT_SETTINGS, loadSettings, parseSettings, saveSettings } from "./settings";

const saved = {
  tuningId: "ff",
  snap: false,
  guides: false,
  labelMode: "names",
  system: "solfege",
  neckZoom: "full",
  maqamId: "bayati",
  root: 8,
  tempo: 90,
  page: "chords",
  guitarStrings: [104, 94, 86, 76, 68, 52],
  guitarCapo: 2,
  tabText: "e|--0--|",
  tabMode: "names",
  progress: {
    find: { attempts: 4, correct: 3, bestStreak: 2, items: { "4": { attempts: 4, correct: 3 } } },
  },
  drillLevels: { find: 2 },
  completedLessons: ["open-courses"],
};

test("nothing stored means the defaults", () => {
  expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
});

test("settings written by the app are read back unchanged", () => {
  expect(parseSettings(JSON.stringify(saved))).toEqual(saved);
});

test.each(["not json", "5", "null", "[]", '"text"'])(
  "garbled storage %s means the defaults",
  (raw) => {
    expect(parseSettings(raw)).toEqual(DEFAULT_SETTINGS);
  },
);

test("each bad value falls back on its own, good ones are kept", () => {
  const raw = JSON.stringify({
    ...saved,
    snap: "yes",
    labelMode: "huge",
    system: 3,
    page: "settings",
    root: 24,
    tempo: 5000,
    tuningId: 7,
  });
  expect(parseSettings(raw)).toEqual({
    ...DEFAULT_SETTINGS,
    guides: false,
    neckZoom: saved.neckZoom,
    maqamId: "bayati",
    guitarStrings: saved.guitarStrings,
    guitarCapo: 2,
    tabText: "e|--0--|",
    tabMode: "names",
    progress: saved.progress,
    drillLevels: saved.drillLevels,
    completedLessons: saved.completedLessons,
  });
});

test("completedLessons keeps string arrays and rejects invalid shapes", () => {
  const lessons = (value: unknown) =>
    parseSettings(JSON.stringify({ completedLessons: value })).completedLessons;
  expect(lessons(["open-courses", "maqam-rast"])).toEqual(["open-courses", "maqam-rast"]);
  expect([lessons("nope"), lessons([1, 2]), lessons(null)]).toEqual([[], [], []]);
});

test("practice progress and levels that are garbled fall back to none, the rest is kept", () => {
  const parsed = parseSettings(JSON.stringify({ ...saved, progress: 7, drillLevels: [1] }));
  expect(parsed.progress).toEqual({});
  expect(parsed.drillLevels).toEqual({});
  expect(parsed.tabText).toBe(saved.tabText);
});

test("a root must be a whole pitch class, 0 to 23, or null for the traditional one", () => {
  const root = (value: unknown) => parseSettings(JSON.stringify({ root: value })).root;
  expect([root(0), root(23), root(null)]).toEqual([0, 23, null]);
  expect([root(-1), root(1.5), root("3")]).toEqual([null, null, null]);
});

test("the page must be a known one", () => {
  const page = (value: unknown) => parseSettings(JSON.stringify({ page: value })).page;
  expect([page("chords"), page("maqam")]).toEqual(["chords", "maqam"]);
  expect([page("home"), page(1)]).toEqual(["maqam", "maqam"]);
});

test("saving some settings keeps the ones it does not mention", () => {
  localStorage.clear();
  saveSettings({ maqamId: "bayati", tempo: 90 });
  saveSettings({ page: "chords" });
  expect(loadSettings()).toEqual({
    ...DEFAULT_SETTINGS,
    maqamId: "bayati",
    tempo: 90,
    page: "chords",
  });
});

const STANDARD = [104, 94, 86, 76, 68, 56];

test("a saved guitar tuning is six even pitches in range, else the first preset (null)", () => {
  const strings = (value: unknown) =>
    parseSettings(JSON.stringify({ guitarStrings: value })).guitarStrings;
  expect(strings(STANDARD)).toEqual(STANDARD);
  expect([strings(null), strings([104, 94]), strings("x")]).toEqual([null, null, null]);
  expect([strings([...STANDARD.slice(1), 105]), strings([...STANDARD.slice(1), 10])]).toEqual([
    null,
    null,
  ]);
  expect(strings([...STANDARD.slice(1), 1.5])).toBeNull();
});

test("a saved capo is a whole fret from 0 to 12", () => {
  const capo = (value: unknown) => parseSettings(JSON.stringify({ guitarCapo: value })).guitarCapo;
  expect([capo(0), capo(12)]).toEqual([0, 12]);
  expect([capo(13), capo(-1), capo(2.5), capo("3")]).toEqual([0, 0, 0, 0]);
});
