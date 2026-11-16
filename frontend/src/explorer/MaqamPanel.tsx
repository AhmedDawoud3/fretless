import type { Interval, Maqam, Scale } from "../api/client";
import { playSteps } from "../audio";
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

function ScaleRibbon({ scale, system }: { scale: Scale; system: NamingSystem }) {
  return (
    <section className="scale-ribbon" aria-label="Scale degrees">
      {scale.playback.map((entry, idx) => {
        const label = formatNoteName(entry.name, system);
        return (
          <button
            // biome-ignore lint/suspicious/noArrayIndexKey: ordered scale playback steps 1..8
            key={idx}
            type="button"
            className={idx === 0 || idx === 7 ? "degree-pill degree-root" : "degree-pill"}
            aria-label={`Play degree ${idx + 1} ${label}`}
            onClick={() => playSteps(entry.pitch)}
          >
            <small>{(idx % 7) + 1}</small>
            <strong>{label}</strong>
          </button>
        );
      })}
    </section>
  );
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
      {scale && (
        <>
          <p>Notes: {noteNames(scale, system)}</p>
          <ScaleRibbon scale={scale} system={system} />
        </>
      )}
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
