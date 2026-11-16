import { useEffect, useRef, useState } from "react";
import type { PageProps } from "../app/useSharedSettings";
import { loadSettings, saveSettings } from "../explorer/settings";
import { TabResult } from "../tab/TabResult";
import { AudioArrangements, applyArrangement } from "./AudioArrangements";
import { AudioControls } from "./AudioControls";
import {
  type AudioLibraryEntry,
  audioLibraryKey,
  findAudioInLibrary,
  loadAudioLibrary,
  removeAudioFromLibrary,
  saveAudioToLibrary,
} from "./audioLibrary";
import { type LoadedAudio, useAudioClip } from "./useAudioClip";
import { type Conversion, useTranscription } from "./useTranscription";
import "./audio.css";

const DEFAULT_FRAME_THRESHOLD = 0.3;
const REJECTED =
  "Could not read that audio file. Use a WAV, MP3, OGG, or FLAC recording under 3 minutes.";
const FAILED = "Could not reach the backend. Start it with `just api`, then try again.";

function Outcome({
  conversion,
  inputKey,
  mode,
  ...page
}: PageProps & { conversion: Conversion; inputKey: string; mode: "frets" | "names" | "both" }) {
  const [selection, setSelection] = useState<{ forResult: object; id: string | null } | null>(null);
  if (conversion.status === "loading")
    return <p className="status">Separating stems & transcribing with Basic Pitch...</p>;
  if (conversion.status === "done") {
    const selectedId =
      selection && selection.forResult === conversion.converted ? selection.id : null;
    const { activeId, activeArrangement, view } = applyArrangement(
      conversion.converted,
      selectedId,
    );
    return (
      <>
        <AudioArrangements
          arrangements={conversion.converted.arrangements}
          activeId={activeId}
          activeArrangement={activeArrangement}
          onSelect={(id) => setSelection({ forResult: conversion.converted, id })}
        />
        <TabResult
          converted={view}
          inputKey={`${inputKey}|${activeId ?? "base"}`}
          mode={mode}
          tempo={view.tempo}
          {...page}
        />
      </>
    );
  }
  if (conversion.status === "idle") return null;
  return (
    <p className="status status-error" role="alert">
      {conversion.status === "rejected" ? REJECTED : FAILED}
    </p>
  );
}

function AudioExplanation() {
  return (
    <section className="why" aria-label="How audio transcription works">
      <h2>How audio transcription works</h2>
      <p>
        Harmonic/percussive stem separation splits Vocals, Instruments, and Bass away from drums,
        Basic Pitch detects quarter-tone bends, and Oud fit scoring builds solo, chord, and bass
        arrangements aligned to the detected BPM and maqam.
      </p>
    </section>
  );
}

const clipMeta = (audio: LoadedAudio | null) => ({
  id: audio ? audio.id : 0,
  name: audio ? audio.name : null,
  url: audio ? audio.url : null,
});

function activeResult(
  cached: AudioLibraryEntry | null,
  tuningId: string,
  mode: "frets" | "names" | "both",
  conversion: Conversion,
): Conversion {
  if (cached && cached.tuningId === tuningId && cached.mode === mode) {
    return { status: "done", converted: cached.converted };
  }
  return conversion;
}

function startAudioTranscribe(
  audio: LoadedAudio | null,
  tuningId: string,
  mode: "frets" | "names" | "both",
  library: readonly AudioLibraryEntry[],
  setCachedEntry: (e: AudioLibraryEntry | null) => void,
  setCachedNotice: (n: string | null) => void,
  transcribe: (b64: string) => void,
) {
  if (!audio) return;
  const hit = findAudioInLibrary(library, audioLibraryKey(audio.name, audio.size, tuningId, mode));
  if (hit) {
    setCachedEntry(hit);
    setCachedNotice(`Loaded from library: ${hit.filename}`);
    return;
  }
  setCachedEntry(null);
  setCachedNotice(null);
  transcribe(audio.base64);
}

function useSaveAudioLibrary(
  conversion: Conversion,
  audio: LoadedAudio | null,
  tuningId: string,
  mode: "frets" | "names" | "both",
  setLibrary: (fn: (prev: AudioLibraryEntry[]) => AudioLibraryEntry[]) => void,
) {
  const lastSavedRef = useRef<object | null>(null);
  useEffect(() => {
    if (conversion.status !== "done" || !audio || lastSavedRef.current === conversion.converted) {
      return;
    }
    lastSavedRef.current = conversion.converted;
    const entry: AudioLibraryEntry = {
      key: audioLibraryKey(audio.name, audio.size, tuningId, mode),
      filename: audio.name,
      tuningId,
      mode,
      converted: conversion.converted,
    };
    setLibrary((prev) => saveAudioToLibrary(prev, entry));
  }, [audio, conversion, mode, setLibrary, tuningId]);
}

/** Audio to Oud: upload MP3/WAV, separate stems, rank Oud arrangements, detect maqam & tempo. */
export function AudioPage({ shared, neck }: PageProps) {
  const [mode, setMode] = useState(() => loadSettings().tabMode);
  const [onsetThreshold, setOnsetThreshold] = useState(0.5);
  const { audio, tooLarge, loadFile, loadExample } = useAudioClip();
  const [library, setLibrary] = useState<AudioLibraryEntry[]>(() => loadAudioLibrary());
  const [cachedEntry, setCachedEntry] = useState<AudioLibraryEntry | null>(null);
  const [cachedNotice, setCachedNotice] = useState<string | null>(null);

  const tuningId = shared.tuningId ?? neck.tuning.id;
  const { conversion, transcribe } = useTranscription({
    tuningId,
    mode,
    onsetThreshold,
    frameThreshold: DEFAULT_FRAME_THRESHOLD,
  });
  useSaveAudioLibrary(conversion, audio, tuningId, mode, setLibrary);

  const handleMode = (next: typeof mode) => {
    setMode(next);
    saveSettings({ tabMode: next });
  };

  const handleSelectLibrary = (entry: AudioLibraryEntry) => {
    if (entry.tuningId !== tuningId) shared.setTuningId(entry.tuningId);
    if (entry.mode !== mode) handleMode(entry.mode);
    setCachedEntry(entry);
    setCachedNotice(`Loaded from library: ${entry.filename}`);
  };

  const handleRemoveLibrary = (key: string) => {
    setLibrary((prev) => removeAudioFromLibrary(prev, key));
    if (cachedEntry?.key === key) {
      setCachedEntry(null);
      setCachedNotice(null);
    }
  };

  const clip = clipMeta(audio);
  const shown = activeResult(cachedEntry, tuningId, mode, conversion);
  const resultKey = cachedEntry
    ? `lib|${cachedEntry.key}`
    : `${clip.id}|${tuningId}|${mode}|${onsetThreshold}`;

  return (
    <>
      <AudioControls
        fileName={clip.name}
        audioUrl={clip.url}
        canTranscribe={audio !== null}
        tooLarge={tooLarge}
        mode={mode}
        onMode={handleMode}
        onsetThreshold={onsetThreshold}
        onOnsetThreshold={setOnsetThreshold}
        onFile={(file) => {
          setCachedNotice(null);
          void loadFile(file);
        }}
        onLoadExample={() => {
          setCachedNotice(null);
          loadExample();
        }}
        onTranscribe={() =>
          startAudioTranscribe(
            audio,
            tuningId,
            mode,
            library,
            setCachedEntry,
            setCachedNotice,
            transcribe,
          )
        }
        cachedNotice={cachedNotice}
        library={library}
        onSelectLibrary={handleSelectLibrary}
        onRemoveLibrary={handleRemoveLibrary}
      />
      <Outcome {...{ shared, neck, mode }} conversion={shown} inputKey={resultKey} />
      <AudioExplanation />
    </>
  );
}
