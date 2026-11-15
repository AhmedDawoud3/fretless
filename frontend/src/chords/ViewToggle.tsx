import type { View } from "./chordView";

const VIEWS: readonly [View, string][] = [
  ["voicings", "Voicings"],
  ["tones", "All chord tones"],
];

type ViewToggleProps = { view: View; onView: (view: View) => void };

/** Two-way switch between the voicings and every chord tone. */
export function ViewToggle({ view, onView }: ViewToggleProps) {
  return (
    <fieldset className="maqam-picker" aria-label="Show on the oud">
      {VIEWS.map(([id, text]) => (
        <button
          key={id}
          type="button"
          className="choice"
          aria-pressed={view === id}
          onClick={() => onView(id)}
        >
          {text}
        </button>
      ))}
    </fieldset>
  );
}
