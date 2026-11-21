import type { ConvertedSystem } from "../api/client";

export type StaffDensity = "compact" | "normal" | "wide";

export const STAFF_DENSITIES: Readonly<
  Record<StaffDensity, { label: string; maxBeats: number; gapScale: number }>
> = {
  compact: { label: "Compact", maxBeats: 24, gapScale: 0.6 },
  normal: { label: "Normal", maxBeats: 18, gapScale: 1 },
  wide: { label: "Wide", maxBeats: 12, gapScale: 1.4 },
};

export type BeatRhythm = "beam" | "stem" | "long";

export type StaffBeat = {
  systemIndex: number;
  columnIndex: number;
  notes: readonly ConvertedSystem["columns"][number]["notes"][number][];
  gapPx: number;
  rhythm: BeatRhythm;
  beamLeft: boolean;
  beamRight: boolean;
  flexWeight: number;
};

export type StaffMeasure = {
  number: number;
  systemIndex: number;
  continued: boolean;
  beats: readonly StaffBeat[];
};

export type StaffRow = {
  systemIndex: number;
  firstMeasure: number;
  labels: readonly string[];
  measures: readonly StaffMeasure[];
};

function gapForDelta(delta: number): number {
  if (delta <= 2) return 0;
  if (delta <= 4) return 8;
  if (delta <= 8) return 16;
  return 24;
}

function beatDelta(
  columns: readonly ConvertedSystem["columns"][number][],
  idx: number,
): number | null {
  const cur = columns[idx];
  const next = columns[idx + 1];
  if (cur && next) return next.index - cur.index;
  const prev = columns[idx - 1];
  return cur && prev ? cur.index - prev.index : null;
}

function rhythmForDelta(delta: number | null): BeatRhythm {
  if (delta === null) return "stem";
  if (delta <= 2) return "beam";
  if (delta <= 6) return "stem";
  return "long";
}

function flexWeightForDelta(delta: number | null): number {
  if (delta === null || delta <= 2) return 1;
  if (delta <= 4) return 1.35;
  if (delta <= 8) return 1.8;
  return 2.3;
}

function toMeasureBeats(
  systemIndex: number,
  columns: readonly ConvertedSystem["columns"][number][],
  gapScale: number,
): StaffBeat[] {
  const rhythms = columns.map((_, idx) => rhythmForDelta(beatDelta(columns, idx)));
  return columns.map((col, idx) => {
    const next = columns[idx + 1];
    const rhythm = rhythms[idx] ?? "stem";
    return {
      systemIndex,
      columnIndex: col.index,
      notes: col.notes,
      gapPx: next ? Math.round(gapForDelta(next.index - col.index) * gapScale) : 0,
      rhythm,
      beamLeft: rhythm === "beam" && rhythms[idx - 1] === "beam",
      beamRight: rhythm === "beam" && rhythms[idx + 1] === "beam",
      flexWeight: next ? flexWeightForDelta(next.index - col.index) : 1,
    };
  });
}

function chunkMeasure(
  number: number,
  systemIndex: number,
  beats: readonly StaffBeat[],
  maxBeats: number,
): StaffMeasure[] {
  const chunks: StaffMeasure[] = [];
  for (let start = 0; start < beats.length; start += maxBeats) {
    const slice = beats.slice(start, start + maxBeats).map((beat, idx, arr) => ({
      ...beat,
      gapPx: idx === arr.length - 1 ? 0 : beat.gapPx,
      beamLeft: idx === 0 ? false : beat.beamLeft,
      beamRight: idx === arr.length - 1 ? false : beat.beamRight,
    }));
    chunks.push({ number, systemIndex, continued: start > 0, beats: slice });
  }
  return chunks;
}

function bucketColumns(system: ConvertedSystem): ConvertedSystem["columns"][number][][] {
  const bars = [...system.bars].sort((a, b) => a - b);
  const sortedCols = [...system.columns].sort((a, b) => a.index - b.index);
  const buckets = new Map<number, ConvertedSystem["columns"][number][]>();
  for (const col of sortedCols) {
    const bucket = bars.filter((b) => b < col.index).length;
    const list = buckets.get(bucket);
    if (list) list.push(col);
    else buckets.set(bucket, [col]);
  }
  return [...buckets.entries()].sort(([a], [b]) => a - b).map(([, cols]) => cols);
}

function rowBeatCount(row: StaffRow): number {
  return row.measures.reduce((sum, m) => sum + m.beats.length, 0);
}

/**
 * Split converted systems at `system.bars` into numbered measures and pack them into
 * fixed-course-label rows so wrapped lines never lose their tuning gutter.
 */
export function buildStaffRows(
  systems: readonly ConvertedSystem[],
  maxBeatsPerRow = 18,
  gapScale = 1,
): StaffRow[] {
  const rows: StaffRow[] = [];
  let measureNo = 0;
  for (const system of systems) {
    for (const cols of bucketColumns(system)) {
      measureNo += 1;
      const beats = toMeasureBeats(system.index, cols, gapScale);
      for (const measure of chunkMeasure(measureNo, system.index, beats, maxBeatsPerRow)) {
        const last = rows.at(-1);
        const fits =
          last &&
          last.systemIndex === system.index &&
          rowBeatCount(last) + measure.beats.length <= maxBeatsPerRow;
        if (fits) {
          rows[rows.length - 1] = { ...last, measures: [...last.measures, measure] };
        } else {
          rows.push({
            systemIndex: system.index,
            firstMeasure: measure.number,
            labels: system.labels,
            measures: [measure],
          });
        }
      }
    }
  }
  return rows;
}
