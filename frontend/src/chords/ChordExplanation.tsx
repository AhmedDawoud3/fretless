import type { ChordResult, Quality } from "../api/client";
import type { NamingSystem } from "../notation/noteName";
import { chordName } from "./chordLabel";
import { chordTonesText } from "./chordView";

type ChordExplanationProps = {
  chord: ChordResult["chord"];
  quality: Quality | undefined;
  system: NamingSystem;
};

/** What the chord is made of, and why a guitar shape does not carry over to the oud as it is. */
export function ChordExplanation({ chord, quality, system }: ChordExplanationProps) {
  return (
    <aside className="why chord-panel">
      <h2>{chordName(chord.name, quality?.name ?? chord.quality_id, system)}</h2>
      <p>Notes: {chordTonesText(chord.tones, system)}.</p>
      <p>
        The oud is tuned mostly in fourths, has no frets, and its strings come in pairs, so a
        six-string guitar shape does not carry over. Oud players use two to four notes of a chord,
        or play its notes one at a time.
      </p>
      <p>
        The root and the third matter most: the root says which chord it is, the third says whether
        it is major or minor. The fifth can often be left out.
      </p>
    </aside>
  );
}
