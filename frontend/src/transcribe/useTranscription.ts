import { useState } from "react";
import { type TabMode, type TranscribeBody, transcribeAudio } from "../api/client";
import { type Conversion, useConvertReply } from "../tab/convertState";

export type { Conversion };

export type TranscribeOptions = {
  tuningId: string;
  mode: TabMode;
  onsetThreshold: number;
  frameThreshold: number;
};

type Asked = { base64: string; id: number };

function requestFor(asked: Asked, options: TranscribeOptions) {
  const body: TranscribeBody = {
    audio_base64: asked.base64,
    oud_tuning: options.tuningId,
    mode: options.mode,
    onset_threshold: options.onsetThreshold,
    frame_threshold: options.frameThreshold,
  };
  const key = `${asked.id}|${options.tuningId}|${options.mode}|${options.onsetThreshold}|${options.frameThreshold}`;
  return { body, key };
}

function runArgs(asked: Asked | null, options: TranscribeOptions) {
  if (!asked) return { key: null, body: null };
  return requestFor(asked, options);
}

/**
 * Transcribes the last requested audio clip. Once started, changing tuning, output mode,
 * or sensitivity re-transcribes that clip automatically.
 */
export function useTranscription(options: TranscribeOptions) {
  const [asked, setAsked] = useState<Asked | null>(null);
  const { key, body } = runArgs(asked, options);
  const conversion = useConvertReply(key, body, transcribeAudio);
  return {
    conversion,
    transcribe: (base64: string) =>
      setAsked((previous) => ({ base64, id: (previous?.id ?? 0) + 1 })),
  };
}
