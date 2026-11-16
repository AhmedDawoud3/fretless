import type { Maqam } from "../../api/client";
import { optionState } from "../optionState";

type MaqamOptionsProps = {
  options: readonly Maqam[];
  /** The right answer, and the one chosen, once answered. */
  answered: { right: string; chosen: string } | null;
  onChoose: (id: string) => void;
};

/** One button per maqam: English and Arabic name. The first nine also answer to number keys. */
export function MaqamOptions({ options, answered, onChoose }: MaqamOptionsProps) {
  return (
    <div className="interval-options">
      {options.map((m, i) => (
        <button
          key={m.id}
          type="button"
          className={`interval-option${optionState(m.id, answered)}`}
          disabled={answered !== null}
          onClick={() => onChoose(m.id)}
        >
          {i < 9 && <kbd>{i + 1}</kbd>}
          {m.name}{" "}
          <span lang="ar" dir="rtl" className="arabic">
            {m.arabic_name}
          </span>
        </button>
      ))}
    </div>
  );
}
