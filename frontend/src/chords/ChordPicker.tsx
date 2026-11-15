import type { Quality } from "../api/client";
import type { RootOption } from "../explorer/rootOptions";
import { Select } from "../explorer/Select";
import type { NamingSystem } from "../notation/noteName";
import { withSymbol } from "./chordLabel";
import type { ChordChoice } from "./useChord";

type ChordPickerProps = {
  /** The twelve chord roots, named in the chosen system. */
  roots: readonly RootOption[];
  qualities: readonly Quality[];
  choice: ChordChoice;
  system: NamingSystem;
  onChoice: (choice: ChordChoice) => void;
};

/** Pick a chord by name: one of twelve roots, and a quality such as "minor — Am". */
export function ChordPicker({ roots, qualities, choice, system, onChoice }: ChordPickerProps) {
  const rootName = roots.find((r) => r.value === choice.root)?.label ?? "";
  const options = qualities.map((q): [string, string] => [
    q.id,
    `${q.name} — ${withSymbol(rootName, q.symbol, system)}`,
  ]);
  return (
    <section className="controls chord-picker" aria-label="Chord by name">
      <fieldset className="maqam-picker" aria-label="Chord root">
        {roots.map((r) => (
          <button
            key={r.value}
            type="button"
            className="choice"
            aria-pressed={choice.root === r.value}
            onClick={() => onChoice({ ...choice, root: r.value })}
          >
            {r.label}
          </button>
        ))}
      </fieldset>
      <Select
        label="Quality"
        value={choice.qualityId}
        options={options}
        onChange={(qualityId) => onChoice({ ...choice, qualityId })}
      />
    </section>
  );
}
