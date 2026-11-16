import { useCallback, useRef, useState } from "react";
import type { PlaybackEvent } from "../api/client";
import { type Instrument, playStrum, playTimed } from "../audio";
import { useRunner } from "../explorer/useRunner";
import { cellKey } from "./cells";
import { secondsPerTick } from "./schedule";
import { lowToHigh, timedEvents } from "./timedEvents";

export const keyOfEvent = (event: PlaybackEvent | null) =>
  event ? cellKey(event.system, event.column) : null;

function strumNotes(event: PlaybackEvent, instrument: Instrument): void {
  const notes = lowToHigh(event);
  if (instrument === "guitar") playStrum(notes, "guitar");
  else playStrum(notes);
}

function playTrack(
  events: readonly PlaybackEvent[],
  speed: number,
  onEvent: (index: number) => void,
  instrument: Instrument,
) {
  const piece = timedEvents(events, secondsPerTick(speed));
  return instrument === "guitar"
    ? playTimed(piece.events, piece.end, onEvent, "guitar")
    : playTimed(piece.events, piece.end, onEvent);
}

const prevIndex = (activeIndex: number) => Math.max(0, activeIndex <= 0 ? 0 : activeIndex - 1);
const nextIndex = (activeIndex: number, length: number) => Math.min(length - 1, activeIndex + 1);
const resolveActiveIndex = (playing: boolean, index: number | null, picked: number | null) =>
  playing ? (index ?? -1) : (picked ?? -1);

/**
 * Plays a tab track (Oud or Guitar), supports stepping ◀/▶, scrubbing, loop, and live column picking.
 */
export function useTabPlayer(
  events: readonly PlaybackEvent[],
  speed: number,
  resetKey: string,
  instrument: Instrument = "oud",
) {
  const { playing, index, begin, stop } = useRunner(resetKey);
  const [picked, setPicked] = useState<number | null>(null);
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    setPicked(null);
  }
  const [loop, setLoop] = useState(false);
  const loopRef = useRef(loop);
  loopRef.current = loop;

  const start = useCallback(() => {
    setPicked(null);
    begin((onEvent) => {
      const run = playTrack(events, speed, onEvent, instrument);
      if (loopRef.current) void run.done.then(() => loopRef.current && start());
      return run;
    });
  }, [begin, events, instrument, speed]);

  const selectIndex = useCallback(
    (at: number) => {
      const target = events[at];
      if (!target) return;
      stop();
      setPicked(at);
      strumNotes(target, instrument);
    },
    [events, instrument, stop],
  );

  const pick = useCallback(
    (key: string) => {
      const at = events.findIndex((e) => keyOfEvent(e) === key);
      if (at !== -1) selectIndex(at);
    },
    [events, selectIndex],
  );

  const activeIndex = resolveActiveIndex(playing, index, picked);
  const current = events[activeIndex] ?? null;

  return {
    playing,
    activeIndex,
    totalEvents: events.length,
    loop,
    toggleLoop: () => setLoop((v) => !v),
    pick,
    selectIndex,
    stepPrev: () => selectIndex(prevIndex(activeIndex)),
    stepNext: () => selectIndex(nextIndex(activeIndex, events.length)),
    current,
    toggle: playing ? stop : start,
    currentKey: keyOfEvent(current),
  };
}
