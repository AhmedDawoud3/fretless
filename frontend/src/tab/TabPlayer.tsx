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

function TrackToolbar({
  hasGuitar,
  track,
  onTrack,
  editMode,
  onToggleEdit,
  onAddColumn,
}: {
  hasGuitar: boolean;
  track: TrackKind;
  onTrack: (track: TrackKind) => void;
  editMode: boolean;
  onToggleEdit: () => void;
  onAddColumn?: () => void;
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

/** Visual tab staff, Dual-track Oud/Guitar player & neck editor, and transport bar. */
export function TabPlayer(props: TabPlayerProps) {
  const hasGuitar = props.guitarSystems.length > 0 && props.guitar !== undefined;
  const activeGuitar = props.track === "guitar" && props.guitar ? props.guitar : null;
  const isGuitar = activeGuitar !== null && hasGuitar;

  const handleOudPlay = (hit: { course: number; position: number; pitch: number }) => {
    playSteps(hit.pitch);
    if (props.editMode) props.onEditOud?.(hit);
  };

  const handleGuitarFret = (string: number, fret: number) => {
    if (props.guitar) {
      const pitch = soundingPitch(props.guitar.strings[string - 1] ?? 0, props.guitar.capo, fret);
      playSteps(pitch, undefined, "guitar");
    }
    if (props.editMode) props.onEditGuitar?.(string, fret);
  };

  return (
    <section
      className="tab-player studio-stage"
      aria-label="Oud view"
      onKeyDown={(e) => onArrowStep(e, props.onPrev, props.onNext)}
    >
      <TrackToolbar
        hasGuitar={hasGuitar}
        track={props.track}
        onTrack={props.onTrack}
        editMode={props.editMode}
        onToggleEdit={props.onToggleEdit}
        onAddColumn={props.onAddColumn}
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
      <VisualTabStaff
        systems={isGuitar ? props.guitarSystems : props.systems}
        mode={props.mode}
        fretDivisor={isGuitar ? 1 : 2}
        activeKey={props.activeKey}
        onPick={props.onPick}
      />
      <div className="neck-scroll">
        <NeckStage
          guitar={isGuitar ? activeGuitar : null}
          activeGuitarFrets={props.activeGuitarFrets}
          neck={props.neck}
          markers={props.markers}
          guides={props.guides}
          snap={props.snap}
          neckZoom={props.neckZoom}
          system={props.system}
          labelMode={props.labelMode}
          onOudHit={handleOudPlay}
          onGuitarFret={handleGuitarFret}
        />
      </div>
    </section>
  );
}
