import { expect, test } from "vitest";
import type { ScaleLocation } from "../api/client";
import { positionToX } from "../neck/geometry";
import { NECK_LAYOUT } from "../neck/layout";
import { pillWidth } from "../neck/pill";
import { highlightAt, scaleMarkers, withMarker } from "./scaleOverlay";

function at(course: number, position: number, degree = 2, alter = 0): ScaleLocation {
  return {
    course,
    position,
    pitch: 96 + position,
    degree,
    name: { letter: "D", alter, octave: 4 },
  };
}

const pill = (label: string) => pillWidth(label, true);

test("degree 1 is the root, every other degree is normal", () => {
  const markers = scaleMarkers([at(1, 0, 1), at(1, 4)], "names", "letters");
  expect(markers.map((m) => m.tone)).toEqual(["root", "normal"]);
});

test("labels follow the label mode, naming the note as the scale spells it", () => {
  const [one] = [at(1, 3, 2, -1)];
  const label = (mode: "frets" | "names" | "both" | "none") =>
    scaleMarkers([one as ScaleLocation], mode, "letters")[0]?.label;
  expect(label("names")).toBe("D𝄳");
  expect(label("frets")).toBe("1.5");
  expect(label("both")).toBe("D𝄳 1.5");
  expect(label("none")).toBeUndefined();
});

test("labels that would overlap on a course fall back to the name, then to the dot alone", () => {
  const crowded = [0, 4, 7, 10, 14, 17, 20, 21, 24].map((p) => at(1, p));
  const markers = scaleMarkers(crowded, "both", "letters");
  expect(markers[0]?.label).toBe("D 0");
  expect(markers[7]?.label).toBeUndefined();
  const labelled = markers.filter((m) => m.label);
  labelled.slice(1).forEach((m, i) => {
    const before = labelled[i];
    const gap =
      positionToX(NECK_LAYOUT, m.position) - positionToX(NECK_LAYOUT, before?.position ?? 0);
    expect(gap).toBeGreaterThanOrEqual((pill(m.label ?? "") + pill(before?.label ?? "")) / 2);
  });
});

test("the extra marker replaces a scale marker at the same spot, otherwise it is added", () => {
  const markers = scaleMarkers([at(1, 4), at(2, 4)], "none", "letters");
  const played = { course: 1, position: 4, label: "x", tone: "active" as const };
  expect(withMarker(markers, played)).toEqual([markers[1], played]);
  expect(withMarker(markers, { ...played, course: 3 })).toHaveLength(3);
  expect(withMarker(markers, null)).toBe(markers);
});

test("highlightAt turns the marker at a location active and leaves the rest", () => {
  const markers = scaleMarkers([at(1, 0, 1), at(1, 4)], "none", "letters");
  const lit = highlightAt(markers, { course: 1, position: 4 });
  expect(lit.map((m) => m.tone)).toEqual(["root", "active"]);
  expect(highlightAt(markers, null)).toBe(markers);
});
