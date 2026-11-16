import type { GuitarTuning, TabMode } from "../api/client";
import { TuningControls } from "../chords/TuningControls";
import type { GuitarTuningState } from "../chords/useGuitarTuning";
import type { RootOption } from "../explorer/rootOptions";
import { Select } from "../explorer/Select";
import { TAB_TEXT_MAX } from "../explorer/settings";
import { EXAMPLE_TAB } from "./example";

const MODES: [TabMode, string][] = [
  ["frets", "Fret numbers"],
  ["names", "Note names"],
  ["both", "Both"],
];

type TabInputProps = {
  text: string;
  onText: (text: string) => void;
  tooLong: boolean;
  mode: TabMode;
  onMode: (mode: TabMode) => void;
  presets: readonly GuitarTuning[];
  tuning: GuitarTuningState;
  names: readonly RootOption[];
  onConvert: () => void;
};

/** Paste a guitar tab, say which guitar it is for and how to print the oud tab, then convert. */
export function TabInput(props: TabInputProps) {
  const { text, onText, tooLong, mode, onMode, presets, tuning, names, onConvert } = props;
  return (
    <section className="tab-input" aria-label="Guitar tab input">
      <label className="tab-label">
        Guitar tab
        <textarea
          className="tab-textarea"
          value={text}
          onChange={(event) => onText(event.target.value)}
          wrap="off"
          spellCheck={false}
          rows={10}
        />
      </label>
      {tooLong && (
        <p className="tab-limit">
          Too long: the limit is {TAB_TEXT_MAX.toLocaleString("en-US")} characters, this text has{" "}
          {text.length.toLocaleString("en-US")}.
        </p>
      )}
      <TuningControls presets={presets} tuning={tuning} names={names} />
      <div className="controls">
        <Select label="Output" value={mode} options={MODES} onChange={onMode} />
        <button type="button" onClick={() => onText(EXAMPLE_TAB)}>
          Load example
        </button>
        <button type="button" disabled={tooLong || text.trim() === ""} onClick={onConvert}>
          Convert
        </button>
      </div>
    </section>
  );
}
