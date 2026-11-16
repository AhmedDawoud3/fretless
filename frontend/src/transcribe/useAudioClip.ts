import { useEffect, useState } from "react";
import { buildExampleWav, bytesToBase64 } from "./exampleWav";

const MAX_AUDIO_BYTES = 12 * 1024 * 1024;

export type LoadedAudio = {
  id: number;
  name: string;
  base64: string;
  url: string | null;
};

function makeUrl(bytes: BlobPart, mime: string): string | null {
  return typeof URL.createObjectURL === "function"
    ? URL.createObjectURL(new Blob([bytes], { type: mime }))
    : null;
}

function revokeUrl(url: string | undefined | null): void {
  if (url && typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(url);
}

function buildClip(
  prev: LoadedAudio | null,
  name: string,
  bytes: Uint8Array,
  mime: string,
): LoadedAudio {
  return {
    id: (prev?.id ?? 0) + 1,
    name,
    base64: bytesToBase64(bytes),
    url: makeUrl(bytes.slice().buffer, mime),
  };
}

/** Manages the uploaded or example audio clip and its object URL lifecycle. */
export function useAudioClip() {
  const [tooLarge, setTooLarge] = useState(false);
  const [audio, setAudio] = useState<LoadedAudio | null>(null);

  useEffect(() => () => revokeUrl(audio?.url), [audio?.url]);

  const loadFile = async (file: File) => {
    if (file.size > MAX_AUDIO_BYTES) {
      setTooLarge(true);
      setAudio(null);
      return;
    }
    setTooLarge(false);
    const bytes = new Uint8Array(await file.arrayBuffer());
    setAudio((prev) => buildClip(prev, file.name, bytes, file.type || "audio/mpeg"));
  };

  const loadExample = () => {
    setTooLarge(false);
    const bytes = buildExampleWav();
    setAudio((prev) => buildClip(prev, "maqam-rast-example.wav", bytes, "audio/wav"));
  };

  return { audio, tooLarge, loadFile, loadExample };
}
