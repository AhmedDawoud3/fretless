import { type CSSProperties, type RefObject, useEffect, useMemo, useRef, useState } from "react";
import type { ConvertedSystem, PlaybackEvent, TabMode } from "../api/client";
import { formatVirtualFret } from "../notation/virtualFret";
import { cellKey } from "./cells";
import { isMeasureLooped, type MeasureLoop, type MeasureRange } from "./measureLoop";
import { scrollWithinContainer } from "./scrollContainer";
import { joinClasses, TabPanelActions, useTabPanelView } from "./TabViewControls";
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
  events?: readonly PlaybackEvent[];
  loopRange?: MeasureLoop | null;
  onSelectMeasure?: (range: MeasureRange) => void;
  onClearLoop?: () => void;
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

function beatColumnStyle(beat: StaffBeat): CSSProperties {
  return beat.gapPx > 0
    ? { flexGrow: beat.flexWeight, marginRight: `${beat.gapPx}px` }
    : { flexGrow: beat.flexWeight };
}

function BeatRhythmView({ beat }: { beat: StaffBeat }) {
  const stemClass = beat.rhythm === "long" ? "vtab-stem vtab-stem-long" : "vtab-stem";
  return (
    <span className="vtab-rhythm" aria-hidden="true">
      {beat.beamLeft && <span className="vtab-beam-l" />}
      <span className={stemClass} />
      {beat.beamRight && <span className="vtab-beam-r" />}
    </span>
  );
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
      style={beatColumnStyle(beat)}
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
        const cell = formatCell(note.position, note.name, mode, fretDivisor);
        const tech = techniques?.[`${note.course}:${beat.columnIndex}`] ?? "";
        return (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed 6 string/course lanes per column
            key={idx}
            className={noteClassName(note.position, fretDivisor)}
            title={`Course ${note.course} · ${cell}${tech} (${note.name})`}
          >
            {`${cell}${tech}`}
          </span>
        );
      })}
      <BeatRhythmView beat={beat} />
    </button>
  );
}

function measureRange(
  measure: StaffMeasure,
  eventIndexByKey: ReadonlyMap<string, number>,
): MeasureRange | null {
  const indices = measure.beats
    .map((b) => eventIndexByKey.get(cellKey(b.systemIndex, b.columnIndex)))
    .filter((idx): idx is number => idx !== undefined);
  if (indices.length === 0) return null;
  return {
    number: measure.number,
    startEvent: Math.min(...indices),
    endEvent: Math.max(...indices),
  };
}

function MeasureHeader({
  measure,
  range,
  isLooped,
  onSelectMeasure,
}: {
  measure: StaffMeasure;
  range: MeasureRange | null;
  isLooped: boolean;
  onSelectMeasure?: (range: MeasureRange) => void;
}) {
  if (!measure.continued && range && onSelectMeasure) {
    return (
      <button
        type="button"
        className={isLooped ? "vtab-measure-no vtab-measure-no-loop" : "vtab-measure-no"}
        aria-label={`Loop measure ${measure.number}`}
        aria-pressed={isLooped}
        onClick={() => onSelectMeasure(range)}
      >
        {measure.number}
      </button>
    );
  }
  return (
    <span className="vtab-measure-no" aria-hidden="true">
      {measure.continued ? "" : measure.number}
    </span>
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
  justifyGrow,
  eventIndexByKey,
  loopRange,
  onPick,
  onSelectMeasure,
}: {
  measure: StaffMeasure;
  labels: readonly string[];
  techniques: Readonly<Record<string, string>> | undefined;
  mode: TabMode;
  fretDivisor: 1 | 2;
  activeKey: string | null;
  isFinal: boolean;
  justifyGrow: boolean;
  eventIndexByKey: ReadonlyMap<string, number>;
  loopRange: MeasureLoop | null;
  onPick: (key: string) => void;
  onSelectMeasure?: (range: MeasureRange) => void;
}) {
  const range = measureRange(measure, eventIndexByKey);
  const isLooped = isMeasureLooped(loopRange, measure.number);
  const isActive =
    activeKey !== null &&
    measure.beats.some((b) => cellKey(b.systemIndex, b.columnIndex) === activeKey);

  return (
    <div
      className={joinClasses(
        "vtab-measure",
        isFinal && "vtab-measure-end",
        isActive && "vtab-measure-active",
        isLooped && "vtab-measure-loop",
      )}
      style={justifyGrow ? { flexGrow: measure.beats.length } : undefined}
    >
      <MeasureHeader
        measure={measure}
        range={range}
        isLooped={isLooped}
        onSelectMeasure={onSelectMeasure}
      />
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
  maxBeats,
  eventIndexByKey,
  loopRange,
  onPick,
  onSelectMeasure,
}: {
  row: StaffRow;
  techniques: Readonly<Record<string, string>> | undefined;
  mode: TabMode;
  fretDivisor: 1 | 2;
  activeKey: string | null;
  isLastRow: boolean;
  maxBeats: number;
  eventIndexByKey: ReadonlyMap<string, number>;
  loopRange: MeasureLoop | null;
  onPick: (key: string) => void;
  onSelectMeasure?: (range: MeasureRange) => void;
}) {
  const rowBeats = row.measures.reduce((sum, m) => sum + m.beats.length, 0);
  const justifyGrow = !(isLastRow && rowBeats < maxBeats * 0.55);

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
              justifyGrow={justifyGrow}
              eventIndexByKey={eventIndexByKey}
              loopRange={loopRange}
              onPick={onPick}
              onSelectMeasure={onSelectMeasure}
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

function LoopPill({
  loopRange,
  onClearLoop,
}: {
  loopRange: MeasureLoop | null;
  onClearLoop?: () => void;
}) {
  if (!loopRange) return null;
  const label =
    loopRange.startMeasure === loopRange.endMeasure
      ? `Loop m.${loopRange.startMeasure}`
      : `Loop m.${loopRange.startMeasure}–${loopRange.endMeasure}`;
  return (
    <span className="vtab-loop-badge">
      <span>{label}</span>
      {onClearLoop && (
        <button
          type="button"
          className="vtab-loop-clear"
          aria-label="Clear loop"
          onClick={onClearLoop}
        >
          ×
        </button>
      )}
    </span>
  );
}

function VisualTabToolbar({
  density,
  onDensity,
  view,
  loopRange,
  onClearLoop,
}: {
  density: StaffDensity;
  onDensity: (d: StaffDensity) => void;
  view: ReturnType<typeof useTabPanelView>;
  loopRange: MeasureLoop | null;
  onClearLoop?: () => void;
}) {
  return (
    <div className="vtab-toolbar" role="toolbar" aria-label="Visual tab controls">
      <div className="vtab-toolbar-left">
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
        <LoopPill loopRange={loopRange} onClearLoop={onClearLoop} />
      </div>
      <TabPanelActions
        scope="visual tab"
        zoom={view.zoom}
        follow={view.follow}
        expanded={view.expanded}
        paper={view.paper}
        onOut={view.zoomOut}
        onReset={view.resetZoom}
        onIn={view.zoomIn}
        onToggleFollow={view.toggleFollow}
        onToggleExpand={view.toggleExpanded}
        onTogglePaper={view.togglePaper}
      />
    </div>
  );
}

/** Songsterr-style engraved 6-string tab staff with rhythm stems, A-B measure loops, and view controls. */
export function VisualTabStaff({
  systems,
  mode,
  fretDivisor,
  activeKey,
  onPick,
  events = [],
  loopRange = null,
  onSelectMeasure,
  onClearLoop,
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
  const eventIndexByKey = useMemo(
    () => new Map(events.map((ev, idx) => [cellKey(ev.system, ev.column), idx])),
    [events],
  );

  useStaffAutoScroll(staffRef, activeKey, view.follow);

  if (rows.length === 0) return null;
  return (
    <div className="vtab-shell">
      <VisualTabToolbar
        density={density}
        onDensity={setDensity}
        view={view}
        loopRange={loopRange}
        onClearLoop={onClearLoop}
      />
      <section
        ref={staffRef}
        className={joinClasses(
          "vtab-staff",
          view.expanded && "vtab-staff-expanded",
          view.paper && "vtab-sheet-paper",
        )}
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
            maxBeats={preset.maxBeats}
            eventIndexByKey={eventIndexByKey}
            loopRange={loopRange}
            onPick={onPick}
            onSelectMeasure={onSelectMeasure}
          />
        ))}
      </section>
    </div>
  );
}
