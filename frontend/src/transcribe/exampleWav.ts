import { stepsToFrequency } from "../audio/frequency";
import { renderPluck } from "../audio/pluck";

const SAMPLE_RATE = 22050;
const EXAMPLE_STEPS = [96, 100, 103, 106] as const;

function writeString(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i += 1) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

/** Encode mono float samples in [-1, 1] into a 16-bit PCM RIFF WAVE byte array. */
export function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array {
  const dataBytes = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataBytes, true);
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i] ?? 0));
    view.setInt16(44 + i * 2, Math.round(clamped * 32767), true);
  }
  return new Uint8Array(buffer);
}

/** Encode bytes into standard base64 in chunks safe for multi-megabyte audio files. */
export function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/** Synthesize a 4-note Maqam Rast phrase (C4, D4, Ed4, F4) as a WAV clip for one-click testing. */
export function buildExampleWav(): Uint8Array {
  const noteSeconds = 0.55;
  const noteSamples = Math.round(SAMPLE_RATE * noteSeconds);
  const total = new Float32Array(EXAMPLE_STEPS.length * noteSamples);
  const random = seededRandom(42);
  EXAMPLE_STEPS.forEach((step, index) => {
    const pluck = renderPluck(stepsToFrequency(step), SAMPLE_RATE, noteSeconds, random);
    total.set(pluck, index * noteSamples);
  });
  return encodeWav(total, SAMPLE_RATE);
}
