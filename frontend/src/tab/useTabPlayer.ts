import { useState } from "react";
import type { PlaybackEvent } from "../api/client";
import { playStrum, playTimed } from "../audio";
import { useRunner } from "../explorer/useRunner";
import { cellKey } from "./cells";
import { secondsPerTick } from "./schedule";
import { timedEvents } from "./timedEvents";

/**
 * Plays the converted piece, or one event of it, and tells which event is current:
 * the one sounding, or else the one last picked. `resetKey` names the inputs the piece
 * came from: when it changes, or the page goes away, playback stops.
 */
export function useTabPlayer(events: readonly PlaybackEvent[], speed: number, resetKey: string) {
  const { playing, index, begin, stop } = useRunner(resetKey);
  const [picked, setPicked] = useState<number | null>(null);

  const start = () => {
    setPicked(null);
    const piece = timedEvents(events, secondsPerTick(speed));
    begin((onEvent) => playTimed(piece.events, piece.end, onEvent));
  };

  /** Shows the event of this column and plays it once; a column with no event does nothing. */
  const pick = (key: string) => {
    const at = events.findIndex((e) => cellKey(e.system, e.column) === key);
    const event = events[at];
    if (!event) return;
    stop();
    setPicked(at);
    playStrum(event.notes.map((n) => n.pitch).sort((a, b) => a - b));
  };

  const current = events[(playing ? index : picked) ?? -1] ?? null;
  return {
    ...{ playing, pick, current },
    toggle: () => (playing ? stop() : start()),
    currentKey: current && cellKey(current.system, current.column),
  };
}
