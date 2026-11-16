import type { NeckOut } from "../api/client";
import type { PageProps } from "../app/useSharedSettings";
import { Select } from "../explorer/Select";
import type { DrillEntry, DrillLevel, RecordAnswer } from "./drill";
import type { Progress } from "./progress";

type SelectedDrillProps = {
  drill: DrillEntry;
  shared: PageProps["shared"];
  neck: NeckOut;
  progress: Progress;
  level: number;
  onLevel: (level: number) => void;
  onRecord: RecordAnswer;
};

const levelOptions = (levels: readonly DrillLevel[]): [string, string][] =>
  levels.map((l) => [String(l.level), `${l.level}. ${l.label}`]);

/** The chosen drill in its shell, with its difficulty. A new tuning, drill or difficulty starts a fresh sitting. */
export function SelectedDrill({
  drill,
  shared,
  neck,
  progress,
  level,
  onLevel,
  onRecord,
}: SelectedDrillProps) {
  const context = {
    neck,
    intervals: shared.intervals ?? [],
    maqamat: shared.maqamat ?? [],
    system: shared.system,
    guides: shared.guides,
    level,
    stats: progress[drill.id]?.items ?? {},
  };
  return (
    <>
      <div className="controls">
        <Select
          label="Difficulty"
          value={String(level)}
          options={levelOptions(drill.levels)}
          onChange={(value) => onLevel(Number(value))}
        />
      </div>
      <div key={`${drill.id}-${level}-${neck.tuning.id}`}>
        {drill.render({ context, onRecord })}
      </div>
    </>
  );
}
