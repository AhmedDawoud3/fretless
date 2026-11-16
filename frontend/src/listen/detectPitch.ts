/**
 * Pitch detection with the YIN algorithm (de Cheveigne and Kawahara, 2002):
 * difference function, cumulative mean normalised difference, absolute
 * threshold, parabolic interpolation.
 */

export const MIN_HZ = 60;
export const MAX_HZ = 1200;
/** Frames quieter than this RMS are treated as silence. */
export const MIN_RMS = 0.01;
/** The first lag whose normalised difference dips below this is the period. */
const DIP_THRESHOLD = 0.12;
/** With no dip below the threshold, the best lag must still beat this. */
const FALLBACK_LIMIT = 0.25;

export type Detection = { frequency: number; clarity: number };

function rms(samples: Float32Array): number {
  let sum = 0;
  for (const x of samples) sum += x * x;
  return Math.sqrt(sum / samples.length);
}

/** Step 1: d(tau) = sum over the window of (x[j] - x[j + tau])^2. */
function differenceFunction(samples: Float32Array, maxLag: number): Float32Array {
  const window = samples.length - maxLag;
  const diff = new Float32Array(maxLag + 1);
  for (let tau = 1; tau <= maxLag; tau++) {
    let sum = 0;
    for (let j = 0; j < window; j++) {
      const delta = samples[j] - samples[j + tau];
      sum += delta * delta;
    }
    diff[tau] = sum;
  }
  return diff;
}

/** Step 2: d'(tau) = d(tau) / (running mean of d up to tau); d'(0) = 1. */
function cumulativeMeanNormalised(diff: Float32Array): Float32Array {
  const out = new Float32Array(diff.length);
  out[0] = 1;
  let running = 0;
  for (let tau = 1; tau < diff.length; tau++) {
    running += diff[tau];
    out[tau] = running === 0 ? 1 : (diff[tau] * tau) / running;
  }
  return out;
}

/** Step 3: first lag under the threshold, followed down to its local minimum. */
function firstDip(cmnd: Float32Array, minLag: number): number | null {
  for (let tau = minLag; tau < cmnd.length - 1; tau++) {
    if (cmnd[tau] < DIP_THRESHOLD) {
      let best = tau;
      while (best + 1 < cmnd.length - 1 && cmnd[best + 1] < cmnd[best]) best++;
      return best;
    }
  }
  return null;
}

/** Fallback: the deepest lag in range, if it is clear enough. */
function deepestDip(cmnd: Float32Array, minLag: number): number | null {
  let best = minLag;
  for (let tau = minLag; tau < cmnd.length - 1; tau++) {
    if (cmnd[tau] < cmnd[best]) best = tau;
  }
  return cmnd[best] < FALLBACK_LIMIT ? best : null;
}

/** Step 4: refine the lag with a parabola through its neighbours. */
function parabolicLag(cmnd: Float32Array, tau: number): number {
  const a = cmnd[tau - 1];
  const b = cmnd[tau];
  const c = cmnd[tau + 1];
  const denominator = a - 2 * b + c;
  return denominator === 0 ? tau : tau + (a - c) / (2 * denominator);
}

/**
 * Detects the fundamental of one frame. Returns null for a quiet frame or when
 * no period is clear. `clarity` is 1 for a perfectly periodic signal.
 */
export function detectPitch(samples: Float32Array, sampleRate: number): Detection | null {
  const minLag = Math.max(2, Math.floor(sampleRate / MAX_HZ));
  const maxLag = Math.min(Math.ceil(sampleRate / MIN_HZ), Math.floor(samples.length / 2));
  if (maxLag <= minLag + 1 || rms(samples) < MIN_RMS) return null;
  const cmnd = cumulativeMeanNormalised(differenceFunction(samples, maxLag));
  const tau = firstDip(cmnd, minLag) ?? deepestDip(cmnd, minLag);
  if (tau === null) return null;
  const clarity = Math.min(1, Math.max(0, 1 - cmnd[tau]));
  return { frequency: sampleRate / parabolicLag(cmnd, tau), clarity };
}
