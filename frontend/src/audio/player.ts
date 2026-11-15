import { stepsToFrequency } from "./frequency";
import { renderPluck } from "./pluck";
import { noteStartTimes } from "./schedule";

const NOTE_SECONDS = 2.5;
const MAX_CACHED = 64;
/** Stopping fades notes out over this long, since cutting a ringing string at once clicks. */
const FADE_SECONDS = 0.03;

let context: AudioContext | undefined;
const buffers = new Map<number, AudioBuffer>();

/** Browsers only allow audio after a user gesture, so create (and resume) on first play. */
function audioContext(): AudioContext {
  context ??= new AudioContext();
  if (context.state === "suspended") void context.resume();
  return context;
}

/** Rendered buffers are cached per tenth of a step (5 cents), oldest dropped first. */
function bufferFor(ctx: AudioContext, steps: number): AudioBuffer {
  const key = Math.round(steps * 10);
  const cached = buffers.get(key);
  if (cached) return cached;
  const samples = renderPluck(
    stepsToFrequency(key / 10),
    ctx.sampleRate,
    NOTE_SECONDS,
    Math.random,
  );
  const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
  buffer.copyToChannel(samples, 0);
  if (buffers.size >= MAX_CACHED) buffers.delete(buffers.keys().next().value ?? key);
  buffers.set(key, buffer);
  return buffer;
}

type Note = { source: AudioBufferSourceNode; gain: GainNode };

function startNote(ctx: AudioContext, steps: number, when: number): Note {
  const source = ctx.createBufferSource();
  source.buffer = bufferFor(ctx, steps);
  const gain = ctx.createGain();
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start(when);
  return { source, gain };
}

function fadeOut(ctx: AudioContext, { source, gain }: Note): void {
  gain.gain.setTargetAtTime(0, ctx.currentTime, FADE_SECONDS / 4);
  source.stop(ctx.currentTime + FADE_SECONDS);
}

/** Pluck one pitch (steps, fractional allowed) now, or at AudioContext time `when`. */
export function playSteps(steps: number, when?: number): void {
  const ctx = audioContext();
  startNote(ctx, steps, when ?? ctx.currentTime);
}

/**
 * Plays notes one after another at `notesPerMinute`. `onNote` fires as each note
 * starts (timer-based, so it can drift slightly from the audio clock).
 * `done` resolves when the last note's slot ends, or when stopped.
 */
export function playSequence(
  steps: readonly number[],
  notesPerMinute: number,
  onNote?: (index: number) => void,
): { stop(): void; done: Promise<void> } {
  const ctx = audioContext();
  const starts = noteStartTimes(steps.length, notesPerMinute);
  const notes = steps.map((s, i) => startNote(ctx, s, ctx.currentTime + starts[i]));
  const timers = starts.map((t, i) => setTimeout(() => onNote?.(i), t * 1000));
  let finish: () => void = () => {};
  const done = new Promise<void>((resolve) => {
    finish = resolve;
  });
  timers.push(setTimeout(finish, (steps.length * 60000) / notesPerMinute));
  return {
    done,
    stop() {
      for (const t of timers) clearTimeout(t);
      for (const note of notes) fadeOut(ctx, note);
      finish();
    },
  };
}
