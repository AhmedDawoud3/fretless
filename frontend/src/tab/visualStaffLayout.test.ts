import { expect, test } from "vitest";
import type { ConvertedSystem } from "../api/client";
import { buildStaffRows, STAFF_DENSITIES } from "./visualStaffLayout";

const LABELS = ["C", "F", "A", "D", "G", "C"];

function makeSys(index: number, colIndexes: number[], bars: number[] = []): ConvertedSystem {
  return {
    index,
    width: Math.max(10, (colIndexes.at(-1) ?? 0) + 2),
    bars,
    labels: LABELS,
    columns: colIndexes.map((ci) => ({
      index: ci,
      notes: [{ course: 1, position: 0, pitch: 96, name: "C" }],
    })),
    techniques: {},
  };
}

test("buildStaffRows splits systems into numbered measures across barlines and skips empty edge bars", () => {
  // Leading bar at 0 and trailing bar at 20 leave empty buckets that must not become measures.
  const sys0 = makeSys(0, [2, 4, 10, 16], [0, 7, 20]);
  const sys1 = makeSys(1, [2, 8], [5]);
  const rows = buildStaffRows([sys0, sys1], 18);

  expect(rows).toHaveLength(2);
  expect(rows[0]?.measures.map((m) => [m.number, m.beats.map((b) => b.columnIndex)])).toEqual([
    [1, [2, 4]],
    [2, [10, 16]],
  ]);
  expect(rows[1]?.measures.map((m) => [m.number, m.beats.map((b) => b.columnIndex)])).toEqual([
    [3, [2]],
    [4, [8]],
  ]);
  expect(rows[0]?.firstMeasure).toBe(1);
  expect(rows[1]?.firstMeasure).toBe(3);
});

test("buildStaffRows computes proportional rhythmic gapPx inside measures and zero at measure end", () => {
  const sys = makeSys(0, [1, 3, 7, 15, 30], [34]);
  const [row] = buildStaffRows([sys], 18);
  const gaps = row?.measures[0]?.beats.map((b) => b.gapPx);
  // deltas: 2 -> 0px, 4 -> 8px, 8 -> 16px, 15 -> 24px, last -> 0px
  expect(gaps).toEqual([0, 8, 16, 24, 0]);
});

test("buildStaffRows wraps on measure boundaries and chunks long barless measures cleanly", () => {
  const twoMeasures = makeSys(0, [1, 3, 5, 7, 9, 13, 15, 17, 19, 21], [11]);
  const wrapped = buildStaffRows([twoMeasures], 6);
  expect(wrapped).toHaveLength(2);
  expect(wrapped[0]?.measures.map((m) => m.number)).toEqual([1]);
  expect(wrapped[1]?.measures.map((m) => m.number)).toEqual([2]);
  expect(wrapped[1]?.labels).toEqual(LABELS);

  const barless = makeSys(
    0,
    Array.from({ length: 10 }, (_, i) => i * 2 + 1),
    [],
  );
  const chunked = buildStaffRows([barless], 4);
  expect(chunked.map((r) => r.measures[0]?.beats.length)).toEqual([4, 4, 2]);
  expect(chunked.map((r) => r.measures[0]?.continued)).toEqual([false, true, true]);
  expect(chunked.map((r) => r.firstMeasure)).toEqual([1, 1, 1]);
});

test("buildStaffRows scales rhythmic gapPx by gapScale while preserving 0 at measure end", () => {
  const sys = makeSys(0, [1, 3, 7, 15, 30], [34]);
  const [wide] = buildStaffRows(
    [sys],
    STAFF_DENSITIES.wide.maxBeats,
    STAFF_DENSITIES.wide.gapScale,
  );
  expect(wide?.measures[0]?.beats.map((b) => b.gapPx)).toEqual([0, 11, 22, 34, 0]);
  const [compact] = buildStaffRows(
    [sys],
    STAFF_DENSITIES.compact.maxBeats,
    STAFF_DENSITIES.compact.gapScale,
  );
  expect(compact?.measures[0]?.beats.map((b) => b.gapPx)).toEqual([0, 5, 10, 14, 0]);
});
