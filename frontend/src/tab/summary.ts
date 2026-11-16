import type { ConvertedSummary } from "../api/client";
import { STEPS_PER_OCTAVE } from "./schedule";

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const OCTAVE_WORDS = ["", "one", "two", "three"];

function pieceMove(steps: number): string[] {
  if (steps === 0) return [];
  const octaves = Math.abs(steps) / STEPS_PER_OCTAVE;
  const words = OCTAVE_WORDS[octaves] ?? String(octaves);
  const direction = steps > 0 ? "up" : "down";
  return [`whole piece moved ${direction} ${words} ${octaves === 1 ? "octave" : "octaves"}`];
}

const when = (n: number, text: string) => (n > 0 ? [text] : []);

/** What conversion did, in plain words: the counts first, then each kind of change that happened. */
export function summaryLine(s: ConvertedSummary): string {
  const left = s.unsupported_systems === 1 ? "it was" : "they were";
  return [
    `${count(s.notes_in, "note", "notes")} in, ${s.notes_out} out`,
    ...pieceMove(s.transposed_steps),
    ...when(s.chords_reduced, `${count(s.chords_reduced, "chord", "chords")} simplified`),
    ...when(s.octave_shifted, `${count(s.octave_shifted, "note", "notes")} moved an octave`),
    ...when(
      s.unsupported_systems,
      `${count(s.unsupported_systems, "system", "systems")} left as ${left}`,
    ),
  ].join(" · ");
}
