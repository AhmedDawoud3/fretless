import type { PlaybackEvent } from "../api/client";
import type { TimedEvent } from "../audio";
import { eventStartSeconds, MAX_GAP_TICKS } from "./schedule";

/** How long the run lasts after its last event starts, so the last chord can ring. */
const TAIL_SECONDS = 1;

/** The pitches of an event, low to high: the order a chord is strummed in. */
export const lowToHigh = (event: PlaybackEvent): number[] =>
  event.notes.map((n) => n.pitch).sort((a, b) => a - b);

function inSystemMedianGap(events: readonly PlaybackEvent[]): number | null {
  const gaps: number[] = [];
  for (let i = 1; i < events.length; i += 1) {
    const prev = events[i - 1];
    const cur = events[i];
    if (prev && cur && cur.system === prev.system && cur.tick > prev.tick) {
      gaps.push(Math.min(MAX_GAP_TICKS, cur.tick - prev.tick));
    }
  }
  if (gaps.length === 0) return null;
  const sorted = [...gaps].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? null;
}

function normalizedTicks(events: readonly PlaybackEvent[]): number[] {
  const beatGap = inSystemMedianGap(events);
  const ticks: number[] = [];
  let now = 0;
  events.forEach((event, i) => {
    const prev = events[i - 1];
    if (prev) {
      const gap =
        event.system !== prev.system && beatGap !== null
          ? beatGap
          : Math.min(MAX_GAP_TICKS, Math.max(0, event.tick - prev.tick));
      now += gap;
    }
    ticks.push(now);
  });
  return ticks;
}

/** The playback events as sound to play: when each starts, and its pitches low to high (a strum). */
export function timedEvents(events: readonly PlaybackEvent[], perTick: number) {
  const starts = eventStartSeconds(normalizedTicks(events), perTick);
  const timed: TimedEvent[] = events.map((e, i) => ({
    at: starts[i] ?? 0,
    steps: lowToHigh(e),
  }));
  return { events: timed, end: events.length === 0 ? 0 : (starts.at(-1) ?? 0) + TAIL_SECONDS };
}
