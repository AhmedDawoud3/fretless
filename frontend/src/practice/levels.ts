import type { DrillLevel } from "./drill";

/** The difficulty the user chose for each drill, by drill id. A drill without one starts at its first level. */
export type DrillLevels = Readonly<Record<string, number>>;

const isLevel = (v: unknown): v is number =>
  Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 4;

export function parseLevels(raw: unknown): DrillLevels {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  const levels = Object.entries(raw).filter((entry): entry is [string, number] =>
    isLevel(entry[1]),
  );
  return Object.fromEntries(levels);
}

/** The level to run: the saved one if the drill has it, else the drill first level. */
export function chosenLevel(levels: readonly DrillLevel[], saved: number | undefined): number {
  const found = levels.find((l) => l.level === saved);
  return (found ?? levels[0])?.level ?? 1;
}
