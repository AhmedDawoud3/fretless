import { expect, test } from "vitest";
import { isMeasureLooped, toggleMeasureLoop } from "./measureLoop";

test("toggleMeasureLoop toggles single measure, extends into A-B ranges, and resets multi-bar loops", () => {
  const m3 = { number: 3, startEvent: 8, endEvent: 11 };
  const m5 = { number: 5, startEvent: 16, endEvent: 19 };
  const m1 = { number: 1, startEvent: 0, endEvent: 3 };
  const m4 = { number: 4, startEvent: 12, endEvent: 15 };

  const single = toggleMeasureLoop(null, m3);
  expect(single).toEqual({ startMeasure: 3, endMeasure: 3, startEvent: 8, endEvent: 11 });
  expect(isMeasureLooped(single, 3)).toBe(true);
  expect(isMeasureLooped(single, 4)).toBe(false);

  expect(toggleMeasureLoop(single, m3)).toBeNull();

  const forward = toggleMeasureLoop(single, m5);
  expect(forward).toEqual({ startMeasure: 3, endMeasure: 5, startEvent: 8, endEvent: 19 });
  expect(isMeasureLooped(forward, 4)).toBe(true);
  expect(isMeasureLooped(forward, 2)).toBe(false);

  const backward = toggleMeasureLoop(single, m1);
  expect(backward).toEqual({ startMeasure: 1, endMeasure: 3, startEvent: 0, endEvent: 11 });

  expect(toggleMeasureLoop(forward, m4)).toEqual({
    startMeasure: 4,
    endMeasure: 4,
    startEvent: 12,
    endEvent: 15,
  });
  expect(isMeasureLooped(null, 1)).toBe(false);
});
