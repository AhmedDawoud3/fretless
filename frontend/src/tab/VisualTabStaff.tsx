import type { ConvertedSystem, TabMode } from "../api/client";
import { formatVirtualFret } from "../notation/virtualFret";
import { cellKey } from "./cells";

type VisualTabStaffProps = {
  systems: readonly ConvertedSystem[];
  mode: TabMode;
  /** 2 for oud quarter-tone steps (position/2), 1 for guitar integer frets. */
  fretDivisor: 1 | 2;
  activeKey: string | null;
  onPick: (key: string) => void;
};

function formatCell(position: number, name: string, mode: TabMode, divisor: 1 | 2): string {
  const fret = divisor === 2 ? formatVirtualFret(position) : String(position);
  if (mode === "names") return name;
  if (mode === "both") return `${fret}(${name})`;
  return fret;
}

function StaffColumn({
  system,
  columnIndex,
  notes,
  mode,
  fretDivisor,
  active,
  onPick,
}: {
  system: ConvertedSystem;
  columnIndex: number;
  notes: ConvertedSystem["columns"][number]["notes"];
  mode: TabMode;
  fretDivisor: 1 | 2;
  active: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      className={active ? "vtab-col vtab-col-active" : "vtab-col"}
      aria-pressed={active}
      aria-label={`System ${system.index + 1}, column ${columnIndex}`}
      onClick={onPick}
    >
      {system.labels.map((_, idx) => {
        const note = notes.find((n) => n.course === idx + 1);
        return (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed 6 string/course lanes per column
            key={idx}
            className={note ? "vtab-note" : "vtab-rest"}
          >
            {note ? formatCell(note.position, note.name, mode, fretDivisor) : "·"}
          </span>
        );
      })}
    </button>
  );
}

/** Songsterr-style interactive visual tab staff: click any column to seek, hear, and inspect on the neck. */
export function VisualTabStaff({
  systems,
  mode,
  fretDivisor,
  activeKey,
  onPick,
}: VisualTabStaffProps) {
  if (systems.length === 0) return null;
  return (
    <section className="vtab-staff" aria-label="Interactive visual tab">
      {systems.map((system) => (
        <div key={system.index} className="vtab-system">
          <div className="vtab-labels" aria-hidden="true">
            {system.labels.map((label, idx) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed 6 course/string rows per system
              <span key={idx} className="vtab-label">
                {label}
              </span>
            ))}
          </div>
          <div className="vtab-columns">
            {system.columns.map((col) => {
              const key = cellKey(system.index, col.index);
              return (
                <StaffColumn
                  key={key}
                  system={system}
                  columnIndex={col.index}
                  notes={col.notes}
                  mode={mode}
                  fretDivisor={fretDivisor}
                  active={activeKey === key}
                  onPick={() => onPick(key)}
                />
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
