import type { Maqam } from "../api/client";

type MaqamPickerProps = {
  maqamat: readonly Maqam[];
  selectedId: string | null;
  onChoose: (id: string | null) => void;
};

type ChoiceProps = { selected: boolean; onClick: () => void; children: React.ReactNode };

function Choice({ selected, onClick, children }: ChoiceProps) {
  return (
    <button type="button" className="choice" aria-pressed={selected} onClick={onClick}>
      {children}
    </button>
  );
}

/** Free play, then one button per maqam: English name with the Arabic name beside it. */
export function MaqamPicker({ maqamat, selectedId, onChoose }: MaqamPickerProps) {
  return (
    <fieldset className="maqam-picker" aria-label="Maqam">
      <Choice selected={selectedId === null} onClick={() => onChoose(null)}>
        Free play
      </Choice>
      {maqamat.map((m) => (
        <Choice key={m.id} selected={selectedId === m.id} onClick={() => onChoose(m.id)}>
          {m.name}{" "}
          <span lang="ar" dir="rtl" className="arabic">
            {m.arabic_name}
          </span>
        </Choice>
      ))}
    </fieldset>
  );
}
