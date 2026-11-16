import { expect, test } from "vitest";
import { CONVERTED } from "./convertedFixture";
import { eventMarkers } from "./eventMarkers";

const chord = CONVERTED.playback[1];
if (!chord) throw new Error("fixture has no chord");

test("each note of the event is an active marker at its course and position", () => {
  expect(eventMarkers(chord, CONVERTED.systems, "frets")).toEqual([
    { course: 1, position: 10, label: "5", tone: "active" },
    { course: 3, position: 0, label: "0", tone: "active" },
  ]);
});

test("labels follow the label mode, naming notes as the API did", () => {
  expect(eventMarkers(chord, CONVERTED.systems, "names").map((m) => m.label)).toEqual(["A", "A"]);
  expect(eventMarkers(chord, CONVERTED.systems, "both").map((m) => m.label)).toEqual([
    "A 5",
    "A 0",
  ]);
  expect(eventMarkers(chord, CONVERTED.systems, "none").map((m) => m.label)).toEqual([
    undefined,
    undefined,
  ]);
});

test("no event, no markers", () => {
  expect(eventMarkers(null, CONVERTED.systems, "both")).toEqual([]);
});
