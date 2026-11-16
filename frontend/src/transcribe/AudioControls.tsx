import { type DragEvent, useState } from "react";
import type { TabMode } from "../api/client";
import { Select } from "../explorer/Select";
import { TAB_MODES } from "../tab/TabInput";

type AudioControlsProps = {
  fileName: string | null;
  audioUrl: string | null;
  canTranscribe: boolean;
  tooLarge: boolean;
  mode: TabMode;
  onMode: (mode: TabMode) => void;
  onsetThreshold: number;
  onOnsetThreshold: (value: number) => void;
  onFile: (file: File) => void;
  onLoadExample: () => void;
  onTranscribe: () => void;
};

const toSensitivity = (threshold: number) => Math.round((1 - threshold) * 100) / 100;

function LoadedAudioBar({ fileName, audioUrl }: { fileName: string; audioUrl: string | null }) {
  return (
    <div className="original-audio">
      <span>
        Loaded: <strong>{fileName}</strong>
      </span>
      {audioUrl && (
        <audio controls src={audioUrl} aria-label="Original recording">
          <track kind="captions" label="Instrumental audio" />
        </audio>
      )}
    </div>
  );
}

/** Drag-and-drop or browse MP3/WAV, tweak Basic Pitch sensitivity, listen, and transcribe. */
export function AudioControls(props: AudioControlsProps) {
  const [dragging, setDragging] = useState(false);
  const {
    fileName,
    audioUrl,
    canTranscribe,
    tooLarge,
    mode,
    onMode,
    onsetThreshold,
    onOnsetThreshold,
    onFile,
    onLoadExample,
    onTranscribe,
  } = props;

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <section
      className={dragging ? "audio-input studio-card audio-drop-active" : "audio-input studio-card"}
      aria-label="Audio input"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <div className="controls">
        <label className="control audio-file-pick">
          Audio file
          <input
            type="file"
            accept=".mp3,.wav,.ogg,.flac,.m4a,audio/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onFile(file);
            }}
          />
        </label>
        <button type="button" onClick={onLoadExample}>
          Load example recording
        </button>
        <Select label="Output" value={mode} options={TAB_MODES} onChange={onMode} />
        <label className="control">
          Sensitivity
          <input
            type="range"
            min={0.2}
            max={0.8}
            step={0.05}
            value={toSensitivity(onsetThreshold)}
            onChange={(event) => onOnsetThreshold(toSensitivity(Number(event.target.value)))}
          />
        </label>
        <button
          type="button"
          className="btn-primary"
          disabled={!canTranscribe || tooLarge}
          onClick={onTranscribe}
        >
          Transcribe to oud
        </button>
      </div>
      {tooLarge && (
        <p className="tab-limit" role="alert">
          That file is over 12 MB. Trim it to a shorter MP3 or WAV clip and try again.
        </p>
      )}
      {fileName ? (
        <LoadedAudioBar fileName={fileName} audioUrl={audioUrl} />
      ) : (
        <p className="drop-hint">
          Drop an MP3, WAV, OGG, or FLAC clip here, or load the Maqam Rast example.
        </p>
      )}
    </section>
  );
}
