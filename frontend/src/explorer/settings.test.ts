import { expect, test } from "vitest";
import { DEFAULT_SETTINGS, parseSettings } from "./settings";

const saved = {
  tuningId: "ff",
  snap: false,
  guides: false,
  labelMode: "names",
  system: "solfege",
  maqamId: "bayati",
  root: 8,
  tempo: 90,
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
    root: 24,
    tempo: 5000,
    tuningId: 7,
  });
  expect(parseSettings(raw)).toEqual({
    ...DEFAULT_SETTINGS,
    guides: false,
    maqamId: "bayati",
  });
});

test("a root must be a whole pitch class, 0 to 23, or null for the traditional one", () => {
  const root = (value: unknown) => parseSettings(JSON.stringify({ root: value })).root;
  expect([root(0), root(23), root(null)]).toEqual([0, 23, null]);
  expect([root(-1), root(1.5), root("3")]).toEqual([null, null, null]);
});
