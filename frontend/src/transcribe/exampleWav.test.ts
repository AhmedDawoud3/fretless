import { expect, test } from "vitest";
import { buildExampleWav, bytesToBase64, encodeWav } from "./exampleWav";

test("encodeWav produces a valid 16-bit PCM RIFF header", () => {
  const wav = encodeWav(new Float32Array([0, 0.5, -0.5, 2, -2]), 22050);
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  expect(String.fromCharCode(...wav.slice(0, 4))).toBe("RIFF");
  expect(String.fromCharCode(...wav.slice(8, 12))).toBe("WAVE");
  expect(view.getUint32(24, true)).toBe(22050);
  expect(view.getUint16(34, true)).toBe(16);
  expect(view.getUint32(40, true)).toBe(10);
  expect(wav.length).toBe(44 + 10);
});

test("bytesToBase64 round-trips arbitrary byte chunks cleanly", () => {
  const sample = Uint8Array.from({ length: 10_000 }, (_, i) => i % 256);
  const encoded = bytesToBase64(sample);
  const decoded = Uint8Array.from(atob(encoded), (ch) => ch.charCodeAt(0));
  expect(decoded).toEqual(sample);
});

test("buildExampleWav generates a non-empty playable Maqam Rast WAV recording", () => {
  const wav = buildExampleWav();
  expect(String.fromCharCode(...wav.slice(0, 4))).toBe("RIFF");
  expect(wav.length).toBeGreaterThan(44_100);
});
