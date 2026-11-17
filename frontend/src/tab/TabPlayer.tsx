import type { KeyboardEvent } from "react";
import type { ConvertedSystem, NeckOut, TabMode } from "../api/client";
import { playSteps } from "../audio";
import { GuitarNeck } from "../chords/GuitarNeck";
import { type Frets, STRING_COUNT, soundingPitch } from "../chords/shape";
import { PlayScale } from "../explorer/PlayScale";
import { type LabelMode, rulerLabelFor } from "../explorer/readout";
import type { NeckZoom } from "../neck/OudNeck";
import { type Marker, OudNeck } from "../neck/OudNeck";
import type { NamingSystem } from "../notation/noteName";
import { VisualTabStaff } from "./VisualTabStaff";

export type TrackKind = "oud" | "guitar";

const WORDS = { play: "Play", rate: "Speed" };
const IGNORED_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

type TabPlayerProps = {
  neck: NeckOut;
  markers: readonly Marker[];
  systems: readonly ConvertedSystem[];
  guitarSystems: readonly ConvertedSystem[];
  guitar?: { strings: readonly number[]; capo: number };
  track: TrackKind;
  onTrack: (track: TrackKind) => void;
  editMode: boolean;
  onToggleEdit: () => void;
  onAddColumn?: () => void;
  onEditOud?: (hit: { course: number; position: number; pitch: number }) => void;
  onEditGuitar?: (string: number, fret: number) => void;
  transpose?: number;
  onTranspose?: (semitones: number) => void;
  mode: TabMode;
  activeKey: string | null;
  onPick: (key: string) => void;
  playing: boolean;
  onToggle: () => void;
  onPrev: () => void;
  onNext: () => void;
  activeIndex: number;
  totalEvents: number;
  onScrub: (index: number) => void;
  loop: boolean;
  onToggleLoop: () => void;
  speed: number;
  onSpeed: (notesPerMinute: number) => void;
  activeGuitarFrets: Frets;
  guides: boolean;
  snap: boolean;
  labelMode: LabelMode;
  neckZoom: NeckZoom;
  system: NamingSystem;
};

const clampTranspose = (val: number) => Math.max(-24, Math.min(24, val));

function formatTranspose(semitones: number): string {
  if (semitones === 0) return "0 st";
  const sign = semitones > 0 ? "+" : "";
  if (semitones % 12 === 0) return `${sign}${semitones} st (${sign}${semitones / 12} oct)`;
  return `${sign}${semitones} st`;
}

function TransposeControls({
  transpose,
  onTranspose,
}: {
  transpose: number;
  onTranspose: (semitones: number) => void;
}) {
  return (
    <fieldset className="transpose-controls" aria-label="Transpose Oud pitch">
      <span className="transpose-label">Transpose</span>
      <button
        type="button"
        aria-label="Transpose down one octave"
        disabled={transpose <= -24}
        onClick={() => onTranspose(clampTranspose(transpose - 12))}
      >
        -1 oct
      </button>
      <button
        type="button"
        aria-label="Transpose down one semitone"
        disabled={transpose <= -24}
        onClick={() => onTranspose(clampTranspose(transpose - 1))}
      >
        −
      </button>
      <span className="transpose-value" aria-live="polite">
        {formatTranspose(transpose)}
      </span>
      <button
        type="button"
        aria-label="Transpose up one semitone"
        disabled={transpose >= 24}
        onClick={() => onTranspose(clampTranspose(transpose + 1))}
      >
        +
      </button>
      <button
        type="button"
        aria-label="Transpose up one octave"
        disabled={transpose >= 24}
        onClick={() => onTranspose(clampTranspose(transpose + 12))}
      >
        +1 oct
      </button>
      {transpose !== 0 && (
        <button type="button" aria-label="Reset transpose" onClick={() => onTranspose(0)}>
          Reset
        </button>
      )}
    </fieldset>
  );
}

function TrackToolbar({
  hasGuitar,
  track,
  onTrack,
  editMode,
  onToggleEdit,
  onAddColumn,
  transpose,
  onTranspose,
}: {
  hasGuitar: boolean;
  track: TrackKind;
  onTrack: (track: TrackKind) => void;
  editMode: boolean;
  onToggleEdit: () => void;
  onAddColumn?: () => void;
  transpose?: number;
  onTranspose?: (semitones: number) => void;
}) {
  return (
    <div className="track-toolbar">
      <fieldset className="segmented" aria-label="Track view">
        <button type="button" aria-pressed={track === "oud"} onClick={() => onTrack("oud")}>
          Oud track
        </button>
        {hasGuitar && (
          <button type="button" aria-pressed={track === "guitar"} onClick={() => onTrack("guitar")}>
            Guitar track
          </button>
        )}
      </fieldset>
      {track === "oud" && onTranspose && (
        <TransposeControls transpose={transpose ?? 0} onTranspose={onTranspose} />
      )}
      <div className="track-edit-actions">
        <button type="button" aria-pressed={editMode} onClick={onToggleEdit}>
          {editMode ? "Editing on neck" : "Edit on neck"}
        </button>
        {editMode && onAddColumn && (
          <button type="button" onClick={onAddColumn}>
            + New column
          </button>
        )}
      </div>
    </div>
  );
}

function TransportControls(props: {
  playing: boolean;
  onToggle: () => void;
  onPrev: () => void;
  onNext: () => void;
  activeIndex: number;
  totalEvents: number;
  onScrub: (index: number) => void;
  loop: boolean;
  onToggleLoop: () => void;
  speed: number;
  onSpeed: (notesPerMinute: number) => void;
}) {
  const {
    playing,
    onToggle,
    onPrev,
    onNext,
    activeIndex,
    totalEvents,
    onScrub,
    loop,
    onToggleLoop,
    speed,
    onSpeed,
  } = props;
  const shownPos = activeIndex >= 0 ? activeIndex + 1 : 0;
  return (
    <div className="controls transport-bar">
      <PlayScale
        playing={playing}
        onToggle={onToggle}
        tempo={speed}
        onTempo={onSpeed}
        words={WORDS}
      />
      <button
        type="button"
        aria-label="Previous event"
        disabled={totalEvents === 0}
        onClick={onPrev}
      >
        ◀
      </button>
      <button type="button" aria-label="Next event" disabled={totalEvents === 0} onClick={onNext}>
        ▶
      </button>
      <button type="button" aria-pressed={loop} onClick={onToggleLoop}>
        Loop
      </button>
      {totalEvents > 0 && (
        <label className="control scrubber">
          Event {shownPos}/{totalEvents}
          <input
            type="range"
            aria-label="Event position"
            min={1}
            max={totalEvents}
            value={Math.max(1, shownPos)}
            onChange={(e) => onScrub(Number(e.target.value) - 1)}
          />
        </label>
      )}
    </div>
  );
}

function NeckStage(props: {
  guitar: { strings: readonly number[]; capo: number } | null;
  activeGuitarFrets: Frets;
  neck: NeckOut;
  markers: readonly Marker[];
  guides: boolean;
  snap: boolean;
  neckZoom: NeckZoom;
  system: NamingSystem;
  labelMode: LabelMode;
  onOudHit: (hit: { course: number; position: number; pitch: number }) => void;
  onGuitarFret: (string: number, fret: number) => void;
}) {
  if (props.guitar) {
    return (
      <GuitarNeck
        frets={props.activeGuitarFrets}
        capo={props.guitar.capo}
        onFret={props.onGuitarFret}
        onNut={(s) => props.onGuitarFret(s, 0)}
      />
    );
  }
  return (
    <OudNeck
      neck={props.neck}
      markers={props.markers}
      showGuides={props.guides}
      snap={props.snap}
      zoom={props.neckZoom}
      system={props.system}
      onPlay={props.onOudHit}
      rulerLabel={rulerLabelFor(props.guides, props.labelMode)}
    />
  );
}

function onArrowStep(event: KeyboardEvent<HTMLElement>, onPrev: () => void, onNext: () => void) {
  const tag = (event.target as HTMLElement | null)?.tagName ?? "";
  if (IGNORED_TAGS.has(tag)) return;
  const action = { ArrowLeft: onPrev, ArrowRight: onNext }[event.key];
  if (!action) return;
  event.preventDefault();
  action();
}

export function emptyGuitarFrets(): Frets {
  return Array.from({ length: STRING_COUNT }, () => null);
}

function resolvePlayerTrack(props: TabPlayerProps) {
  const hasGuitar = props.guitarSystems.length > 0 && props.guitar !== undefined;
  const activeGuitar = props.track === "guitar" && props.guitar ? props.guitar : null;
  const isGuitar = activeGuitar !== null && hasGuitar;
  return {
    hasGuitar,
    activeGuitar: isGuitar ? activeGuitar : null,
    isGuitar,
    staffSystems: isGuitar ? props.guitarSystems : props.systems,
    fretDivisor: (isGuitar ? 1 : 2) as 1 | 2,
  };
}

function playOudHit(
  hit: { course: number; position: number; pitch: number },
  editMode: boolean,
  onEditOud?: (hit: { course: number; position: number; pitch: number }) => void,
) {
  playSteps(hit.pitch);
  if (editMode) onEditOud?.(hit);
}

function playGuitarFretHit(
  guitar: { strings: readonly number[]; capo: number } | undefined,
  string: number,
  fret: number,
  editMode: boolean,
  onEditGuitar?: (string: number, fret: number) => void,
) {
  if (guitar) {
    playSteps(
      soundingPitch(guitar.strings[string - 1] ?? 0, guitar.capo, fret),
      undefined,
      "guitar",
    );
  }
  if (editMode) onEditGuitar?.(string, fret);
}

/** Visual tab staff, Dual-track Oud/Guitar player & neck editor, and transport bar. */
export function TabPlayer(props: TabPlayerProps) {
  const view = resolvePlayerTrack(props);

  return (
    <section
      className="tab-player studio-stage"
      aria-label="Oud view"
      onKeyDown={(e) => onArrowStep(e, props.onPrev, props.onNext)}
    >
      <TrackToolbar
        hasGuitar={view.hasGuitar}
        track={props.track}
        onTrack={props.onTrack}
        editMode={props.editMode}
        onToggleEdit={props.onToggleEdit}
        onAddColumn={props.onAddColumn}
        transpose={props.transpose}
        onTranspose={props.onTranspose}
      />
      <TransportControls
        playing={props.playing}
        onToggle={props.onToggle}
        onPrev={props.onPrev}
        onNext={props.onNext}
        activeIndex={props.activeIndex}
        totalEvents={props.totalEvents}
        onScrub={props.onScrub}
        loop={props.loop}
        onToggleLoop={props.onToggleLoop}
        speed={props.speed}
        onSpeed={props.onSpeed}
      />
      <p className="tab-note">
        Text tabs carry no real rhythm: notes are spaced by how far apart they are written, so the
        speed is only approximate.
      </p>
      <div className="neck-scroll">
        <NeckStage
          guitar={view.activeGuitar}
          activeGuitarFrets={props.activeGuitarFrets}
          neck={props.neck}
          markers={props.markers}
          guides={props.guides}
          snap={props.snap}
          neckZoom={props.neckZoom}
          system={props.system}
          labelMode={props.labelMode}
          onOudHit={(hit) => playOudHit(hit, props.editMode, props.onEditOud)}
          onGuitarFret={(s, f) =>
            playGuitarFretHit(props.guitar, s, f, props.editMode, props.onEditGuitar)
          }
        />
      </div>
      <VisualTabStaff
        systems={view.staffSystems}
        mode={props.mode}
        fretDivisor={view.fretDivisor}
        activeKey={props.activeKey}
        onPick={props.onPick}
      />
    </section>
  );
}
