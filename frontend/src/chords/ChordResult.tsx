import { useState } from "react";
import type { ChordResult as ChordData, Quality } from "../api/client";
import type { PageProps } from "../app/useSharedSettings";
import { playSteps, playStrum } from "../audio";
import { labelledMarkers } from "../explorer/labelledMarkers";
import { rulerLabelFor } from "../explorer/readout";
import { highlightAt } from "../explorer/scaleOverlay";
import { usePlayback } from "../explorer/usePlayback";
import { OudNeck } from "../neck/OudNeck";
import { ChordExplanation } from "./ChordExplanation";
import { shownLocations, toNeckNotes, type View } from "./chordView";
import { ViewToggle } from "./ViewToggle";
import { VoicingList } from "./VoicingList";

/** Notes per minute of the arpeggio: unhurried, so each note can be heard and followed. */
const ARPEGGIO_TEMPO = 140;

type ChordResultProps = PageProps & { chord: ChordData; quality: Quality | undefined };

const lowToHigh = (pitches: readonly number[]) => [...pitches].sort((a, b) => a - b);

/**
 * The chord on the oud: ranked voicings (the first is shown at once) or every chord
 * tone on the neck, plus an arpeggio. Remounted for each chord so it starts fresh.
 */
export function ChordResult({ shared, neck, chord, quality }: ChordResultProps) {
  const { system, labelMode, guides } = shared;
  const [view, setView] = useState<View>("voicings");
  const [selected, setSelected] = useState(0);
  const playback = usePlayback("chord");
  const notes = toNeckNotes(shownLocations(view, chord, selected));
  const markers = highlightAt(labelledMarkers(notes, labelMode, system), playback.location);
  const strum = (index: number) =>
    playStrum(lowToHigh((chord.voicings[index]?.locations ?? []).map((l) => l.pitch)));
  const select = (index: number) => {
    setSelected(index);
    strum(index);
  };
  const toggleArpeggio = () =>
    playback.playing ? playback.stop() : playback.start(chord.arpeggio, ARPEGGIO_TEMPO);
  return (
    <section className="chord-result" aria-label="Chord on the oud">
      <div className="controls">
        <ViewToggle view={view} onView={setView} />
        <button type="button" onClick={toggleArpeggio}>
          {playback.playing ? "Stop" : "Play arpeggio"}
        </button>
        <button type="button" disabled={view !== "voicings"} onClick={() => strum(selected)}>
          Strum voicing
        </button>
      </div>
      {view === "voicings" && (
        <VoicingList
          voicings={chord.voicings}
          selected={selected}
          system={system}
          onSelect={select}
        />
      )}
      <div className="neck-scroll">
        <OudNeck
          neck={neck}
          markers={markers}
          showGuides={guides}
          snap={shared.snap}
          onPlay={(hit) => playSteps(hit.pitch)}
          rulerLabel={rulerLabelFor(guides, labelMode)}
        />
      </div>
      <ChordExplanation chord={chord.chord} quality={quality} system={system} />
    </section>
  );
}
