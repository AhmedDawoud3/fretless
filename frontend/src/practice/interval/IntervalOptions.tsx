import type { Interval } from "../../api/client";

type IntervalOptionsProps = {
  options: readonly Interval[];
  /** The right answer, and the one chosen, once answered. */
  answered: { right: string; chosen: string } | null;
  onChoose: (id: string) => void;
};

function stateOf(id: string, answered: IntervalOptionsProps["answered"]): string {
  if (!answered) return "";
  if (id === answered.right) return " option-right";
  return id === answered.chosen ? " option-wrong" : "";
}

/** One button per interval: its name and guitar-fret wording. The first nine also answer to number keys. */
export function IntervalOptions({ options, answered, onChoose }: IntervalOptionsProps) {
  return (
    <div className="interval-options">
      {options.map((o, i) => (
        <button
          key={o.id}
          type="button"
          className={`interval-option${stateOf(o.id, answered)}`}
          disabled={answered !== null}
          onClick={() => onChoose(o.id)}
        >
          {i < 9 && <kbd>{i + 1}</kbd>}
          {o.name} · {o.frets}
        </button>
      ))}
    </div>
  );
}
