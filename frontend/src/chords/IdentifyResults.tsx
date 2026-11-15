import type { ChordMatch, Identified } from "../api/client";
import { formatNoteName, type NamingSystem } from "../notation/noteName";
import { matchLabel } from "./chordLabel";
import type { ChordChoice } from "./useChord";

type IdentifyResultsProps = {
  identified: Identified | null;
  failed: boolean;
  system: NamingSystem;
  choice: ChordChoice;
  onChoose: (match: ChordMatch) => void;
  onStrum: () => void;
};

const isChosen = (match: ChordMatch, choice: ChordChoice) =>
  match.root === choice.root && match.quality_id === choice.qualityId;

function Matches(props: IdentifyResultsProps & { identified: Identified }) {
  const { identified, system, choice, onChoose } = props;
  if (identified.notes.length === 0) return <p>Open a string or press a fret to enter a shape.</p>;
  if (identified.matches.length === 0) {
    return <p>No chord I know. Try the name picker.</p>;
  }
  return (
    <fieldset className="matches" aria-label="Chords this shape could be">
      {identified.matches.map((m) => (
        <button
          key={`${m.root}-${m.quality_id}-${m.bass.letter}${m.bass.alter}`}
          type="button"
          aria-pressed={isChosen(m, choice)}
          onClick={() => onChoose(m)}
        >
          {matchLabel(m, system)}
        </button>
      ))}
    </fieldset>
  );
}

/** What the entered shape sounds, the chords it could be, and a strum button. */
export function IdentifyResults(props: IdentifyResultsProps) {
  const { identified, failed, system, onStrum } = props;
  if (failed) {
    return (
      <p className="status status-error" role="alert">
        Could not identify this shape. Is the backend running?
      </p>
    );
  }
  if (!identified) return null;
  const notes = [...identified.notes].sort((a, b) => a.pitch - b.pitch);
  return (
    <div className="identify">
      <p>
        Sounding, low to high:{" "}
        <strong>
          {notes.map((n) => formatNoteName(n.name, system, true)).join("  ") || "nothing"}
        </strong>{" "}
        <button type="button" disabled={notes.length === 0} onClick={onStrum}>
          Strum
        </button>
      </p>
      <Matches {...props} identified={identified} />
    </div>
  );
}
