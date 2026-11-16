import type { Interval, Maqam, Scale } from "../api/client";
import { formatNoteName, type NamingSystem } from "../notation/noteName";
import { describeGaps } from "./intervals";

type MaqamPanelProps = {
  maqam: Maqam;
  scale: Scale | null;
  failed: boolean;
  system: NamingSystem;
  /** From the API; null until loaded (or if it failed), when the gaps line is left out. */
  intervals: readonly Interval[] | null;
};

function noteNames(scale: Scale, system: NamingSystem): string {
  return scale.degrees
    .map((d) => formatNoteName({ letter: d.letter, alter: d.alter, octave: 0 }, system))
    .join(" ");
}

/** What the chosen maqam is, which notes it uses, and its gaps as a guitarist counts them. */
export function MaqamPanel({ maqam, scale, failed, system, intervals }: MaqamPanelProps) {
  return (
    <aside className="why maqam-panel">
      <h2>
        {maqam.name}{" "}
        <span lang="ar" dir="rtl" className="arabic">
          {maqam.arabic_name}
        </span>
      </h2>
      <p>{maqam.description}</p>
      {scale && <p>Notes: {noteNames(scale, system)}</p>}
      {failed && <p role="alert">Could not load this scale.</p>}
      {intervals && (
        <p>
          From each note to the next, in guitar frets: {describeGaps(maqam.intervals, intervals)}.
        </p>
      )}
      <p>
        A gap with a ½ in it falls between two frets. Those are the quarter tones a guitar cannot
        play.
      </p>
    </aside>
  );
}
