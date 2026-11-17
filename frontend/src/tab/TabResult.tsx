import { useEffect, useState } from "react";
import type {
  Converted,
  ConvertedSystem,
  DetectedMaqam,
  NeckOut,
  PlaybackEvent,
  TabMode,
} from "../api/client";
import type { PageProps } from "../app/useSharedSettings";
import { type Frets, STRING_COUNT } from "../chords/shape";
import { saveSettings } from "../explorer/settings";
import { DEFAULT_TEMPO } from "../explorer/tempo";
import { AlterationList } from "./AlterationList";
import { CopyButton } from "./CopyButton";
import { eventMarkers } from "./eventMarkers";
import { MaqamDetectBar, resolveNeckMarkers, useMaqamSolo } from "./MaqamDetectBar";
import { summaryLine } from "./summary";
import { emptyGuitarFrets, TabPlayer, type TrackKind } from "./TabPlayer";
import { TabText } from "./TabText";
import { placeOudNote, renderOudSystemText, systemsToPlayback } from "./tabEdit";
import { useTabPlayer } from "./useTabPlayer";

const NO_TAB = "No guitar tab found in that text. A tab line looks like  e|--0--3--|";
const ASCII_ALTER: Readonly<Record<number, string>> = {
  [-2]: "b",
  [-1]: "d",
  0: "",
  1: "+",
  2: "#",
};

type TabResultProps = PageProps & {
  converted: Converted;
  /** Names the inputs behind this result: when it changes, playback stops. */
  inputKey: string;
  mode?: TabMode;
  tempo?: number | null;
  guitar?: { strings: readonly number[]; capo: number };
  onEditGuitar?: (line: number, columnIndex: number | null, fret: number) => void;
  transpose?: number;
  onTranspose?: (semitones: number) => void;
};

function asciiNameAt(neck: NeckOut, course: number, position: number): string {
  const loc = neck.locations.find((l) => l.course === course && l.position === position);
  if (!loc) return "?";
  return `${loc.name.letter}${ASCII_ALTER[loc.name.alter] ?? ""}`;
}

function fretsForEvent(event: PlaybackEvent | null): Frets {
  const frets: (number | null)[] = Array.from({ length: STRING_COUNT }, () => null);
  for (const n of event?.notes ?? []) {
    if (n.course >= 1 && n.course <= STRING_COUNT) frets[n.course - 1] = n.position;
  }
  return frets;
}

function applyOudEdit(
  systems: readonly ConvertedSystem[],
  neck: NeckOut,
  hit: { course: number; position: number; pitch: number },
  target: { system: number; column: number } | null,
): ConvertedSystem[] {
  const name = asciiNameAt(neck, hit.course, hit.position);
  const lastIdx = systems.length - 1;
  return systems.map((sys, idx) =>
    (target ? sys.index === target.system : idx === lastIdx)
      ? placeOudNote(sys, target ? target.column : null, { ...hit, name })
      : sys,
  );
}

function resolvePlayback(
  converted: Converted,
  editedSystems: readonly ConvertedSystem[] | null,
  isGuitar: boolean,
): PlaybackEvent[] {
  if (isGuitar) return converted.guitar_playback;
  return editedSystems ? systemsToPlayback(editedSystems) : converted.playback;
}

function AsciiTabDrawer({
  text,
  systems,
  activeKey,
  onPick,
}: {
  text: string;
  systems: readonly ConvertedSystem[];
  activeKey: string | null;
  onPick: (key: string) => void;
}) {
  return (
    <details className="ascii-drawer" open>
      <summary>ASCII Oud Tab</summary>
      <div className="drawer-toolbar">
        <CopyButton text={text} />
      </div>
      <section className="tab-output" aria-label="Converted tab">
        <TabText text={text} systems={systems} activeKey={activeKey} onPick={onPick} />
      </section>
    </details>
  );
}

function activeTrack(
  track: TrackKind,
  converted: Converted,
  guitar: TabResultProps["guitar"],
): TrackKind {
  const hasGuitar = converted.guitar_systems.length > 0 && guitar !== undefined;
  return track === "guitar" && hasGuitar ? "guitar" : "oud";
}

function oudTarget(appendNext: boolean, current: PlaybackEvent | null) {
  return !appendNext && current ? { system: current.system, column: current.column } : null;
}

function guitarTarget(appendNext: boolean, current: PlaybackEvent | null): number | null {
  return appendNext ? null : (current?.column ?? null);
}

function openMaqamExplorer(active: DetectedMaqam | null, setPage: PageProps["shared"]["setPage"]) {
  if (active) saveSettings({ maqamId: active.maqam_id, root: active.root });
  setPage("maqam");
}

function renderedText(
  converted: Converted,
  editedSystems: readonly ConvertedSystem[] | null,
  mode: TabMode,
): string {
  return editedSystems
    ? editedSystems.map((s) => renderOudSystemText(s, mode)).join("\n\n")
    : converted.text;
}

/** Visual dual-track player & neck editor, alterations, and collapsible ASCII tab drawer. */
export function TabResult({
  converted,
  shared,
  neck,
  inputKey,
  mode = "frets",
  tempo,
  guitar,
  onEditGuitar,
  transpose,
  onTranspose,
}: TabResultProps) {
  const [speed, setSpeed] = useState(tempo ?? DEFAULT_TEMPO);
  const [track, setTrack] = useState<TrackKind>("oud");
  const [editMode, setEditMode] = useState(false);
  const [appendNext, setAppendNext] = useState(false);
  const [editedSystems, setEditedSystems] = useState<ConvertedSystem[] | null>(null);

  useEffect(() => {
    if (tempo != null) setSpeed(tempo);
  }, [tempo]);

  // Reset local Oud edits when source input or conversion changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: inputKey invalidates local edits
  useEffect(() => {
    setEditedSystems(null);
    setAppendNext(false);
  }, [inputKey]);

  const effectiveTrack = activeTrack(track, converted, guitar);
  const isGuitar = effectiveTrack === "guitar";
  const oudSystems = editedSystems ?? converted.systems;
  const activePlayback = resolvePlayback(converted, editedSystems, isGuitar);
  const solo = useMaqamSolo(converted.detected_maqam);

  const player = useTabPlayer(
    activePlayback,
    speed,
    `${inputKey}|${effectiveTrack}`,
    effectiveTrack,
  );

  if (converted.systems.length === 0) return <p className="status">{NO_TAB}</p>;

  const pickOudColumn = (key: string) => {
    setTrack("oud");
    player.pick(key);
  };

  const handleEditOud = (hit: { course: number; position: number; pitch: number }) => {
    setEditedSystems(applyOudEdit(oudSystems, neck, hit, oudTarget(appendNext, player.current)));
    setAppendNext(false);
  };

  const handleEditGuitar = (string: number, fret: number) => {
    onEditGuitar?.(string, guitarTarget(appendNext, player.current), fret);
    setAppendNext(false);
  };

  const neckMarkers = resolveNeckMarkers(
    isGuitar,
    solo.soloMode ? solo.active : null,
    neck,
    shared,
    eventMarkers(player.current, oudSystems, shared.labelMode),
  );

  return (
    <section className="tab-result" aria-label="Conversion result">
      <p className="tab-summary">{summaryLine(converted.summary)}</p>
      <MaqamDetectBar
        hidden={isGuitar}
        neck={neck}
        system={shared.system}
        candidates={converted.detected_maqam}
        selectedIdx={solo.selectedIdx}
        soloMode={solo.soloMode}
        onSelect={solo.setSelectedIdx}
        onToggleSolo={() => solo.setSoloMode((v) => !v)}
        onExplore={() => openMaqamExplorer(solo.active, shared.setPage)}
      />
      <TabPlayer
        neck={neck}
        markers={neckMarkers}
        systems={oudSystems}
        guitarSystems={converted.guitar_systems}
        guitar={guitar}
        track={effectiveTrack}
        onTrack={setTrack}
        editMode={editMode}
        onToggleEdit={() => setEditMode((v) => !v)}
        onAddColumn={() => setAppendNext(true)}
        onEditOud={handleEditOud}
        onEditGuitar={handleEditGuitar}
        transpose={transpose}
        onTranspose={onTranspose}
        mode={mode}
        activeKey={player.currentKey}
        onPick={player.pick}
        playing={player.playing}
        onToggle={player.toggle}
        onPrev={player.stepPrev}
        onNext={player.stepNext}
        activeIndex={player.activeIndex}
        totalEvents={player.totalEvents}
        onScrub={player.selectIndex}
        loop={player.loop}
        onToggleLoop={player.toggleLoop}
        speed={speed}
        onSpeed={setSpeed}
        activeGuitarFrets={isGuitar ? fretsForEvent(player.current) : emptyGuitarFrets()}
        guides={shared.guides}
        snap={shared.snap}
        labelMode={shared.labelMode}
        neckZoom={shared.neckZoom}
        system={shared.system}
      />
      <div className="tab-secondary-grid">
        <AlterationList
          alterations={converted.alterations}
          systems={oudSystems}
          onPick={pickOudColumn}
        />
        <AsciiTabDrawer
          text={renderedText(converted, editedSystems, mode)}
          systems={oudSystems}
          activeKey={isGuitar ? null : player.currentKey}
          onPick={pickOudColumn}
        />
      </div>
    </section>
  );
}
