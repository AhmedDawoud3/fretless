import { useCallback, useRef, useState } from "react";
import type { PlaybackEvent } from "../api/client";
import { type Instrument, playStrum, playTimed } from "../audio";
import { useRunner } from "../explorer/useRunner";
import { cellKey } from "./cells";
import { type MeasureLoop, type MeasureRange, toggleMeasureLoop } from "./measureLoop";
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
  end?: number,
) {
  const slice = end != null ? events.slice(from, end + 1) : events.slice(from);
  return playTrack(slice, speed, (offset) => onEvent(from + offset), instrument);
}

function resolveLoopBounds(range: MeasureLoop | null, from: number, length: number) {
  if (!range) return { start: clampStart(from, length), end: undefined, repeatFrom: 0 };
  const inRange = from >= range.startEvent && from <= range.endEvent;
  return {
    start: clampStart(inRange ? from : range.startEvent, length),
    end: clampStart(range.endEvent, length),
    repeatFrom: range.startEvent,
  };
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
  const [loopRange, setLoopRange] = useState<MeasureLoop | null>(null);
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    setPicked(null);
    setLoopRange(null);
  }
  const [loop, setLoop] = useState(false);
  const repeatRef = useRef(false);
  repeatRef.current = loop || loopRange !== null;
  const loopRangeRef = useRef(loopRange);
  loopRangeRef.current = loopRange;

  const startFrom = useCallback(
    (from: number) => {
      const bounds = resolveLoopBounds(loopRangeRef.current, from, events.length);
      setPicked(null);
      begin((onEvent) => {
        const run = playSlice(events, bounds.start, speed, onEvent, instrument, bounds.end);
        return loopableRun(run, repeatRef, () => startFrom(bounds.repeatFrom));
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

  const selectMeasureLoop = useCallback(
    (range: MeasureRange) => {
      const next = toggleMeasureLoop(loopRangeRef.current, range);
      stop();
      setLoopRange(next);
      if (next) setPicked(next.startEvent);
    },
    [stop],
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
    loopRange,
    selectMeasureLoop,
    clearLoopRange: () => setLoopRange(null),
    pick,
    selectIndex,
    stepPrev: () => selectIndex(prevIndex(activeIndex)),
    stepNext: () => selectIndex(nextIndex(activeIndex, events.length)),
    current,
    toggle: playing ? stop : () => startFrom(picked ?? 0),
    currentKey: keyOfEvent(current),
  };
}
