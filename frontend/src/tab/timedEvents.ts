import type { PlaybackEvent } from "../api/client";
import type { TimedEvent } from "../audio";
import { eventStartSeconds } from "./schedule";

/** How long the run lasts after its last event starts, so the last chord can ring. */
const TAIL_SECONDS = 1;

/** The playback events as sound to play: when each starts, and its pitches low to high (a strum). */
export function timedEvents(events: readonly PlaybackEvent[], perTick: number) {
  const starts = eventStartSeconds(
    events.map((e) => e.tick),
    perTick,
  );
  const timed: TimedEvent[] = events.map((e, i) => ({
    at: starts[i] ?? 0,
    steps: e.notes.map((n) => n.pitch).sort((a, b) => a - b),
  }));
  return { events: timed, end: events.length === 0 ? 0 : (starts.at(-1) ?? 0) + TAIL_SECONDS };
}
