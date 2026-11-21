import { type CSSProperties, type RefObject, useEffect, useMemo, useRef, useState } from "react";
import type { ConvertedSystem, TabMode } from "../api/client";
import { formatVirtualFret } from "../notation/virtualFret";
import { cellKey } from "./cells";
import { scrollWithinContainer } from "./scrollContainer";
import { TabPanelActions, useTabPanelView } from "./TabViewControls";
import {
  buildStaffRows,
  STAFF_DENSITIES,
  type StaffBeat,
  type StaffDensity,
  type StaffMeasure,
  type StaffRow,
} from "./visualStaffLayout";

type VisualTabStaffProps = {
  systems: readonly ConvertedSystem[];
  mode: TabMode;
  /** 2 for oud quarter-tone steps (position/2), 1 for guitar integer frets. */
  fretDivisor: 1 | 2;
  activeKey: string | null;
  onPick: (key: string) => void;
};

const STRING_LANES = [0, 1, 2, 3, 4, 5] as const;
const DENSITY_KEYS: readonly StaffDensity[] = ["compact", "normal", "wide"];

function formatCell(position: number, name: string, mode: TabMode, divisor: 1 | 2): string {
  const fret = divisor === 2 ? formatVirtualFret(position) : String(position);
  if (mode === "names") return name;
  if (mode === "both") return `${fret}(${name})`;
  return fret;
}

function noteClassName(position: number, divisor: 1 | 2): string {
  if (position === 0) return "vtab-note vtab-note-open";
  if (divisor === 2 && position % 2 === 1) return "vtab-note vtab-note-quarter";
  return "vtab-note";
}

function StaffColumn({
  beat,
  labels,
  techniques,
  mode,
  fretDivisor,
  active,
  onPick,
}: {
  beat: StaffBeat;
  labels: readonly string[];
  techniques: Readonly<Record<string, string>> | undefined;
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
      aria-label={`System ${beat.systemIndex + 1}, column ${beat.columnIndex}`}
      style={beat.gapPx > 0 ? { marginRight: `${beat.gapPx}px` } : undefined}
      onClick={onPick}
    >
      {labels.map((_, idx) => {
        const note = beat.notes.find((n) => n.course === idx + 1);
        if (!note) {
          return (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed 6 string/course lanes per column
              key={idx}
              className="vtab-empty"
              aria-hidden="true"
            />
          );
        }
        const tech = techniques?.[`${note.course}:${beat.columnIndex}`] ?? "";
        return (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed 6 string/course lanes per column
            key={idx}
            className={noteClassName(note.position, fretDivisor)}
          >
            {`${formatCell(note.position, note.name, mode, fretDivisor)}${tech}`}
          </span>
        );
      })}
    </button>
  );
}

function StaffMeasureView({
  measure,
  labels,
  techniques,
  mode,
  fretDivisor,
  activeKey,
  isFinal,
  onPick,
}: {
  measure: StaffMeasure;
  labels: readonly string[];
  techniques: Readonly<Record<string, string>> | undefined;
  mode: TabMode;
  fretDivisor: 1 | 2;
  activeKey: string | null;
  isFinal: boolean;
  onPick: (key: string) => void;
}) {
  return (
    <div className={isFinal ? "vtab-measure vtab-measure-end" : "vtab-measure"}>
      <span className="vtab-measure-no" aria-hidden="true">
        {measure.continued ? "" : measure.number}
      </span>
      <div className="vtab-measure-beats">
        {measure.beats.map((beat) => {
          const key = cellKey(beat.systemIndex, beat.columnIndex);
          return (
            <StaffColumn
              key={key}
              beat={beat}
              labels={labels}
              techniques={techniques}
              mode={mode}
              fretDivisor={fretDivisor}
              active={activeKey === key}
              onPick={() => onPick(key)}
            />
          );
        })}
      </div>
    </div>
  );
}

function StaffRowView({
  row,
  techniques,
  mode,
  fretDivisor,
  activeKey,
  isLastRow,
  onPick,
}: {
  row: StaffRow;
  techniques: Readonly<Record<string, string>> | undefined;
  mode: TabMode;
  fretDivisor: 1 | 2;
  activeKey: string | null;
  isLastRow: boolean;
  onPick: (key: string) => void;
}) {
  return (
    <div className="vtab-row">
      <div className="vtab-gutter" aria-hidden="true">
        <span className="vtab-gutter-bar">{`m.${row.firstMeasure}`}</span>
        {row.labels.map((label, idx) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed 6 course/string rows per staff
          <span key={idx} className="vtab-label">
            {label}
          </span>
        ))}
      </div>
      <div className="vtab-row-body">
        <div className="vtab-measures">
          <div className="vtab-strings" aria-hidden="true">
            {STRING_LANES.map((lane) => (
              <span key={lane} className="vtab-string-line" />
            ))}
          </div>
          {row.measures.map((measure, idx) => (
            <StaffMeasureView
              key={`${measure.systemIndex}-${measure.number}-${measure.beats[0]?.columnIndex ?? idx}`}
              measure={measure}
              labels={row.labels}
              techniques={techniques}
              mode={mode}
              fretDivisor={fretDivisor}
              activeKey={activeKey}
              isFinal={isLastRow && idx === row.measures.length - 1}
              onPick={onPick}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function useStaffAutoScroll(
  staffRef: RefObject<HTMLElement | null>,
  activeKey: string | null,
  follow: boolean,
) {
  useEffect(() => {
    if (!follow || !activeKey || !staffRef.current) return;
    const activeEl = staffRef.current.querySelector<HTMLElement>(".vtab-col-active");
    if (!activeEl) return;
    scrollWithinContainer(staffRef.current, activeEl, 24);
    scrollWithinContainer(activeEl.closest<HTMLElement>(".vtab-row-body"), activeEl, 48);
  }, [activeKey, follow, staffRef]);
}

function VisualTabToolbar({
  density,
  onDensity,
  view,
}: {
  density: StaffDensity;
  onDensity: (d: StaffDensity) => void;
  view: ReturnType<typeof useTabPanelView>;
}) {
  return (
    <div className="vtab-toolbar" role="toolbar" aria-label="Visual tab controls">
      <fieldset className="tab-density" aria-label="Staff spacing">
        {DENSITY_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={density === key}
            onClick={() => onDensity(key)}
          >
            {STAFF_DENSITIES[key].label}
          </button>
        ))}
      </fieldset>
      <TabPanelActions
        scope="visual tab"
        zoom={view.zoom}
        follow={view.follow}
        expanded={view.expanded}
        onOut={view.zoomOut}
        onReset={view.resetZoom}
        onIn={view.zoomIn}
        onToggleFollow={view.toggleFollow}
        onToggleExpand={view.toggleExpanded}
      />
    </div>
  );
}

/** Interactive 6-string tab staff with numbered measures, rhythmic spacing, and view controls. */
export function VisualTabStaff({
  systems,
  mode,
  fretDivisor,
  activeKey,
  onPick,
}: VisualTabStaffProps) {
  const staffRef = useRef<HTMLElement | null>(null);
  const [density, setDensity] = useState<StaffDensity>("normal");
  const view = useTabPanelView();
  const preset = STAFF_DENSITIES[density];

  const rows = useMemo(
    () => buildStaffRows(systems, preset.maxBeats, preset.gapScale),
    [systems, preset.maxBeats, preset.gapScale],
  );
  const techBySystem = useMemo(
    () => new Map(systems.map((s) => [s.index, s.techniques])),
    [systems],
  );

  useStaffAutoScroll(staffRef, activeKey, view.follow);

  if (rows.length === 0) return null;
  return (
    <div className="vtab-shell">
      <VisualTabToolbar density={density} onDensity={setDensity} view={view} />
      <section
        ref={staffRef}
        className={view.expanded ? "vtab-staff vtab-staff-expanded" : "vtab-staff"}
        aria-label="Interactive visual tab"
        style={{ "--vtab-zoom": String(view.zoom / 100) } as CSSProperties}
      >
        {rows.map((row, idx) => (
          <StaffRowView
            key={`${row.systemIndex}-${row.firstMeasure}-${row.measures[0]?.beats[0]?.columnIndex ?? idx}`}
            row={row}
            techniques={techBySystem.get(row.systemIndex)}
            mode={mode}
            fretDivisor={fretDivisor}
            activeKey={activeKey}
            isLastRow={idx === rows.length - 1}
            onPick={onPick}
          />
        ))}
      </section>
    </div>
  );
}
