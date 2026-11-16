import type { Heard } from "./assess";
import { tunerWords } from "./feedback";

type Situation = {
  listening: boolean;
  /** The target is an open course. */
  open: boolean;
  /** The question is already passed. */
  passed: boolean;
  /** A pitch in steps as a spoken note name. */
  spell: (pitch: number) => string;
};

/** The one line under the meter: what to do, or what was heard. */
export function liveWords(heard: Heard, { listening, open, passed, spell }: Situation): string {
  if (passed) return "Held it.";
  if (!listening) return "Press Start listening, then play the note.";
  if (heard.kind === "nothing") return "Listening... play the note.";
  if (heard.kind === "wrong") return `I heard ${spell(heard.step)}, not the note asked for.`;
  return tunerWords(heard.comparison, { open, octaves: heard.octaves });
}
