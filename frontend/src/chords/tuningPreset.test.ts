import { expect, test } from "vitest";
import type { GuitarTuning } from "../api/client";
import { presetIdFor } from "./tuningPreset";

const name = { letter: "E", alter: 0, octave: 4 } as const;
const preset = (id: string, pitches: number[]): GuitarTuning => ({
  id,
  label: id,
  strings: pitches.map((pitch, i) => ({ string: i + 1, pitch, name })),
});
const presets = [preset("standard", [100, 95]), preset("drop", [100, 93])];

test("strings equal to a preset are that preset", () => {
  expect(presetIdFor([100, 93], presets)).toBe("drop");
});

test("any edited string makes the tuning custom", () => {
  expect(presetIdFor([100, 94], presets)).toBe("custom");
});
