import { expect, test } from "vitest";
import { CONVERTED } from "./convertedFixture";
import { timedEvents } from "./timedEvents";

test("events start by their tick gaps, each chord low to high, and the run ends a second after the last", () => {
  const { events, end } = timedEvents(CONVERTED.playback, 0.5);
  expect(events).toEqual([
    { at: 0, steps: [102] },
    { at: 1, steps: [86, 106] },
  ]);
  expect(end).toBe(2);
});

test("a long silence between events is cut to the longest gap", () => {
  const far = [
    { system: 0, column: 0, tick: 0, notes: [{ pitch: 90, course: 1, position: 0 }] },
    { system: 1, column: 0, tick: 500, notes: [{ pitch: 92, course: 1, position: 2 }] },
  ];
  expect(timedEvents(far, 1).events.map((e) => e.at)).toEqual([0, 16]);
});

test("nothing to play ends at once", () => {
  expect(timedEvents([], 1)).toEqual({ events: [], end: 0 });
});
