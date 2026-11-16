import type { DrillEntry } from "./drill";
import { type Progress, summarise } from "./progress";

type DrillPickerProps = {
  drills: readonly DrillEntry[];
  selectedId: string | null;
  progress: Progress;
  onSelect: (id: string) => void;
};

function statsLine(progress: Progress, id: string): string {
  const s = summarise(progress[id]);
  if (!s) return "Not tried yet";
  const tries = `${s.attempts} ${s.attempts === 1 ? "try" : "tries"}`;
  return `${tries} · ${s.percent}% right · best streak ${s.bestStreak}`;
}

/** One card per drill: its name, one line about it, and how the user has done. */
export function DrillPicker({ drills, selectedId, progress, onSelect }: DrillPickerProps) {
  return (
    <div className="drill-picker">
      {drills.map((d) => (
        <button
          key={d.id}
          type="button"
          className="drill-card"
          aria-pressed={selectedId === d.id}
          onClick={() => onSelect(d.id)}
        >
          <strong>{d.title}</strong>
          <span>{d.blurb}</span>
          <small>{statsLine(progress, d.id)}</small>
        </button>
      ))}
    </div>
  );
}
