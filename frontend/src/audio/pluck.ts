/** A course is two unison strings, tuned this many cents apart from the centre. */
const DETUNE_CENTS = 3;
/** Ring time (to -60 dB) of the lowest strings, in seconds; high strings ring shorter. */
const LOW_RING_SECONDS = 3.5;
const LOW_FREQUENCY = 65;

function ringSeconds(frequency: number): number {
  return (
    LOW_RING_SECONDS / (1 + 0.08 * Math.log2(Math.max(frequency, LOW_FREQUENCY) / LOW_FREQUENCY))
  );
}

/**
 * The pluck: smoothed noise (rounder than raw noise) with its mean removed, since
 * a DC offset would never decay in the loop, then scaled to a peak of 1.
 */
function excitation(length: number, random: () => number): Float32Array {
  const noise = Array.from({ length }, () => random() * 2 - 1);
  const smooth = noise.map((x, i) => (x + (noise[i - 1] ?? 0)) / 2);
  const mean = smooth.reduce((sum, x) => sum + x, 0) / length;
  const centred = smooth.map((x) => x - mean);
  const peak = Math.max(...centred.map(Math.abs)) || 1;
  return Float32Array.from(centred, (x) => x / peak);
}

/**
 * The loop passes any leftover offset unchanged, so it would outlast the note
 * and make a slow thump. A one-pole high-pass removes it. The result is clamped
 * because the filter can overshoot the input peak slightly.
 */
function blockDc(input: Float32Array): Float32Array {
  const out = new Float32Array(input.length);
  let previousIn = 0;
  let previousOut = 0;
  for (let i = 0; i < input.length; i++) {
    previousOut = input[i] - previousIn + 0.995 * previousOut;
    previousIn = input[i];
    out[i] = Math.max(-1, Math.min(1, previousOut));
  }
  return out;
}

/**
 * One Karplus-Strong string: a noise burst circulating in a delay line with an
 * averaging low-pass (each pass darkens the tone) and a gain that sets the decay.
 * A first-order all-pass supplies the fractional part of the delay so the pitch
 * is exact without the extra darkening that linear interpolation would add.
 */
function renderString(
  frequency: number,
  sampleRate: number,
  length: number,
  random: () => number,
): Float32Array {
  // Loop delay = whole + allpass (0.5..1.5) + averaging filter (0.5) = one period.
  const whole = Math.floor(sampleRate / frequency - 1);
  const allpassDelay = sampleRate / frequency - 0.5 - whole;
  const c = (1 - allpassDelay) / (1 + allpassDelay);
  const gain = 10 ** (-3 / (ringSeconds(frequency) * frequency));
  const out = new Float32Array(length);
  out.set(excitation(whole + 2, random).subarray(0, Math.min(length, whole + 2)));
  const averaged = (i: number) => 0.5 * gain * (out[i - whole] + out[i - whole - 1]);
  let previous = averaged(whole + 1);
  for (let i = whole + 2; i < length; i++) {
    const current = averaged(i);
    out[i] = c * current + previous - c * out[i - 1];
    previous = current;
  }
  return out;
}

/**
 * Renders an oud-like pluck: two unison strings slightly detuned, mixed.
 * `random` returns values in [0, 1); pass a seeded one for repeatable output.
 * Samples are within [-1, 1].
 */
export function renderPluck(
  frequency: number,
  sampleRate: number,
  seconds: number,
  random: () => number,
): Float32Array {
  const length = Math.round(sampleRate * seconds);
  const ratio = 2 ** (DETUNE_CENTS / 1200);
  const sharp = renderString(frequency * ratio, sampleRate, length, random);
  const flat = renderString(frequency / ratio, sampleRate, length, random);
  return blockDc(sharp.map((x, i) => (x + flat[i]) / 2));
}
