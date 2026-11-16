import { useState } from "react";
import type { PageProps } from "../app/useSharedSettings";
import { loadSettings, saveSettings } from "../explorer/settings";
import { TabResult } from "../tab/TabResult";
import { AudioControls } from "./AudioControls";
import { useAudioClip } from "./useAudioClip";
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
  if (conversion.status === "loading")
    return <p className="status">Transcribing audio with Basic Pitch...</p>;
  if (conversion.status === "done") {
    return <TabResult converted={conversion.converted} inputKey={inputKey} mode={mode} {...page} />;
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
        Spotify Basic Pitch detects polyphonic notes and pitch contours, snaps quarter-tone bends
        onto the 24-step oud grid, and arranges chords and melodies for minimal hand movement on
        your chosen tuning.
      </p>
    </section>
  );
}

const clipMeta = (audio: { id: number; name: string; url: string | null } | null) => ({
  id: audio ? audio.id : 0,
  name: audio ? audio.name : null,
  url: audio ? audio.url : null,
});

/** Audio to Oud: upload MP3/WAV or try an example, run Basic Pitch, play Oud tab & neck. */
export function AudioPage({ shared, neck }: PageProps) {
  const [mode, setMode] = useState(() => loadSettings().tabMode);
  const [onsetThreshold, setOnsetThreshold] = useState(0.5);
  const { audio, tooLarge, loadFile, loadExample } = useAudioClip();

  const tuningId = shared.tuningId ?? neck.tuning.id;
  const { conversion, transcribe } = useTranscription({
    tuningId,
    mode,
    onsetThreshold,
    frameThreshold: DEFAULT_FRAME_THRESHOLD,
  });

  const handleMode = (next: typeof mode) => {
    setMode(next);
    saveSettings({ tabMode: next });
  };
  const clip = clipMeta(audio);

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
        onFile={(file) => void loadFile(file)}
        onLoadExample={loadExample}
        onTranscribe={() => audio && transcribe(audio.base64)}
      />
      <Outcome
        {...{ shared, neck, conversion, mode }}
        inputKey={`${clip.id}|${tuningId}|${mode}|${onsetThreshold}`}
      />
      <AudioExplanation />
    </>
  );
}
