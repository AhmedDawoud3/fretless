/** Deterministic synthetic signals for the detector tests. */

/** Small seeded random source in [0, 1). */
export function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** Harmonic tone: `amplitudes[k]` is the level of harmonic k + 1. `decay` is an envelope time constant in seconds. */
export function harmonicTone(
  frequency: number,
  amplitudes: number[],
  sampleRate: number,
  length: number,
  decay = Number.POSITIVE_INFINITY,
): Float32Array {
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    let sum = 0;
    amplitudes.forEach((a, k) => {
      sum += a * Math.sin(2 * Math.PI * frequency * (k + 1) * t);
    });
    out[i] = sum * Math.exp(-t / decay);
  }
  return out;
}

export const sine = (f: number, sampleRate: number, length: number) =>
  harmonicTone(f, [0.5], sampleRate, length);

export function rms(xs: Float32Array): number {
  return Math.sqrt(xs.reduce((sum, x) => sum + x * x, 0) / xs.length);
}

/** Uniform white noise with the given RMS. */
export function whiteNoise(rmsLevel: number, length: number, random: () => number): Float32Array {
  const scale = rmsLevel * Math.sqrt(12);
  return Float32Array.from({ length }, () => (random() - 0.5) * scale);
}

export function add(a: Float32Array, b: Float32Array): Float32Array {
  return a.map((x, i) => x + b[i]);
}

/** Adds noise `db` decibels relative to the signal's RMS (negative = quieter). */
export function withNoise(signal: Float32Array, db: number, random: () => number): Float32Array {
  return add(signal, whiteNoise(rms(signal) * 10 ** (db / 20), signal.length, random));
}

/** Signed distance in cents from `reference` to `measured`. */
export function centsBetween(measured: number, reference: number): number {
  return 1200 * Math.log2(measured / reference);
}
