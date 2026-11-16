import { fftSizeFor } from "./bufferSize";

/** Browser edge: a running microphone capture. Not unit tested, jsdom has no Web Audio. */
export type MicrophoneSession = { close(): void };

/** Pitch-hostile processing must be off, or the signal is bent before we hear it. */
const RAW_AUDIO = { echoCancellation: false, noiseSuppression: false, autoGainControl: false };

export function microphoneAvailable(): boolean {
  return (
    window.isSecureContext !== false &&
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    typeof AudioContext === "function"
  );
}

/**
 * Opens the microphone and calls `onFrame` with the latest time-domain
 * samples on every animation frame. Call only from a user gesture.
 */
export async function openMicrophone(
  onFrame: (samples: Float32Array, sampleRate: number) => void,
): Promise<MicrophoneSession> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: RAW_AUDIO });
  try {
    return await startCapture(stream, onFrame);
  } catch (error) {
    for (const track of stream.getTracks()) track.stop();
    throw error;
  }
}

async function startCapture(
  stream: MediaStream,
  onFrame: (samples: Float32Array, sampleRate: number) => void,
): Promise<MicrophoneSession> {
  const context = new AudioContext();
  const analyser = context.createAnalyser();
  analyser.fftSize = fftSizeFor(context.sampleRate);
  // Not connected to the destination: the mic must never play back through the speakers.
  context.createMediaStreamSource(stream).connect(analyser);
  await context.resume();
  const buffer = new Float32Array(analyser.fftSize);
  let frame = 0;
  const tick = () => {
    analyser.getFloatTimeDomainData(buffer);
    onFrame(buffer, context.sampleRate);
    frame = requestAnimationFrame(tick);
  };
  tick();
  return {
    close() {
      cancelAnimationFrame(frame);
      for (const track of stream.getTracks()) track.stop();
      void context.close();
    },
  };
}
