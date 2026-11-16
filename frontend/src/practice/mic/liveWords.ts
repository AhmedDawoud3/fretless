import type { Heard } from "./assess";
import { tunerWords } from "./feedback";

type Situation = {
  listening: boolean;
  /** The target is an open course. */
  open: boolean;
  /** The note that was heard when it was the wrong one, already spelled out. */
  heardName: string;
};

/** The one line under the meter: what to do, or what was heard. */
export function liveWords(heard: Heard, { listening, open, heardName }: Situation): string {
  if (!listening) return "Press Start listening, then play the note.";
  if (heard.kind === "nothing") return "Listening... play the note.";
  if (heard.kind === "wrong") return `I heard ${heardName}, not the note asked for.`;
  return tunerWords(heard.comparison, { open, octaves: heard.octaves });
}
