import { expect, test } from "vitest";
import type { NeckOut } from "../api/client";
import { describePlay, formatCents, markerLabel, rulerLabelFor } from "./readout";

const neck: NeckOut = {
  tuning: { id: "cc", label: "C-C" },
  courses: [],
  locations: [
    { course: 1, position: 0, pitch: 96, name: { letter: "C", alter: 0, octave: 4 } },
    { course: 1, position: 1, pitch: 97, name: { letter: "C", alter: 1, octave: 4 } },
    { course: 1, position: 2, pitch: 98, name: { letter: "C", alter: 2, octave: 4 } },
  ],
};

test("a grid play names the note with no offset", () => {
  const r = describePlay(neck, { course: 1, position: 1, pitch: 97 }, "letters");
  expect(r).toEqual({ course: 1, fret: "0.5", name: "C𝄲4", cents: 0 });
});

test("a continuous play reports the nearest grid note and a signed cent offset", () => {
  const r = describePlay(neck, { course: 1, position: 1.4, pitch: 97.4 }, "solfege");
  expect(r?.name).toBe("Do𝄲4");
  expect(r?.cents).toBe(20);
  expect(describePlay(neck, { course: 1, position: 0.7, pitch: 96.7 }, "letters")?.cents).toBe(-15);
});

test("formatCents shows a sign, and nothing when exactly on the note", () => {
  expect(formatCents(20)).toBe("+20 cents");
  expect(formatCents(-15)).toBe("-15 cents");
  expect(formatCents(0)).toBe("");
});

test("marker labels follow the label mode", () => {
  const r = { course: 1, fret: "1.5", name: "D𝄳4", cents: 0 };
  expect(markerLabel(r, "frets")).toBe("1.5");
  expect(markerLabel(r, "names")).toBe("D𝄳");
  expect(markerLabel(r, "both")).toBe("D𝄳 1.5");
  expect(markerLabel(r, "none")).toBeUndefined();
});

test("the ruler shows fret numbers only with guides on and frets in the labels", () => {
  expect(rulerLabelFor(true, "both")?.(3)).toBe("1.5");
  expect(rulerLabelFor(true, "frets")).toBeDefined();
  expect([rulerLabelFor(false, "both"), rulerLabelFor(true, "names")]).toEqual([
    undefined,
    undefined,
  ]);
});
