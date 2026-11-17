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

function playSlice(
  events: readonly PlaybackEvent[],
  from: number,
  speed: number,
  onEvent: (index: number) => void,
  instrument: Instrument,
) {
  const slice = events.slice(from);
  return playTrack(slice, speed, (offset) => onEvent(from + offset), instrument);
}

function loopableRun(
  run: ReturnType<typeof playTrack>,
  loopRef: { current: boolean },
  onRepeat: () => void,
) {
  let cancelled = false;
  if (loopRef.current) {
    void run.done.then(() => {
      if (!cancelled && loopRef.current) onRepeat();
    });
  }
  return {
    done: run.done,
    stop: () => {
      cancelled = true;
      run.stop();
    },
  };
}

const clampStart = (from: number, length: number) =>
  length === 0 ? 0 : Math.max(0, Math.min(from, length - 1));

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

  const startFrom = useCallback(
    (from: number) => {
      const startIndex = clampStart(from, events.length);
      setPicked(null);
      begin((onEvent) => {
        const run = playSlice(events, startIndex, speed, onEvent, instrument);
        return loopableRun(run, loopRef, () => startFrom(0));
      });
    },
    [begin, events, instrument, speed],
  );

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
    toggle: playing ? stop : () => startFrom(picked ?? 0),
    currentKey: keyOfEvent(current),
  };
}
