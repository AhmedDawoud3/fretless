import type { Voicing } from "../api/client";
import type { NamingSystem } from "../notation/noteName";
import { describeVoicing } from "./chordView";

type VoicingListProps = {
  voicings: readonly Voicing[];
  selected: number;
  system: NamingSystem;
  onSelect: (index: number) => void;
};

/** One card per voicing, best first. A card is a button: choosing it shows and strums the shape. */
export function VoicingList({ voicings, selected, system, onSelect }: VoicingListProps) {
  if (voicings.length === 0) return <p>No easy voicing for this chord. Try all its tones.</p>;
  return (
    <ul className="voicings" aria-label="Voicings">
      {voicings.map((v, i) => {
        const card = describeVoicing(v, system);
        return (
          <li key={card.notes.join("|")}>
            <button
              type="button"
              className="voicing"
              aria-pressed={selected === i}
              onClick={() => onSelect(i)}
            >
              <span className="voicing-notes">
                {card.notes.map((note) => (
                  <span key={note}>{note}</span>
                ))}
              </span>
              {card.tags.length > 0 && (
                <span className="voicing-tags">
                  {card.tags.map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
