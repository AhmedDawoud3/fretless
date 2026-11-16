import type { ReactNode } from "react";
import type { GuitarTuning } from "../api/client";
import type { RootOption } from "../explorer/rootOptions";
import { Select } from "../explorer/Select";
import { CAPO_MAX, PITCH_MAX, PITCH_MIN } from "./shape";
import { CUSTOM, presetIdFor } from "./tuningPreset";
import type { GuitarTuningState } from "./useGuitarTuning";

type TuningControlsProps = {
  presets: readonly GuitarTuning[];
  tuning: GuitarTuningState;
  /** Names of the pitch classes in the chosen naming system, to name each open string. */
  names: readonly RootOption[];
  children?: ReactNode;
};

function StringTuning({
  string,
  pitch,
  name,
  tuning,
}: {
  string: number;
  pitch: number;
  name: string;
  tuning: GuitarTuningState;
}) {
  return (
    <div className="string-tuning">
      <button
        type="button"
        aria-label={`String ${string} down a semitone`}
        disabled={pitch <= PITCH_MIN}
        onClick={() => tuning.tune(string, -1)}
      >
        −
      </button>
      <span className="string-name">
        String {string}: <strong>{name}</strong>
      </span>
      <button
        type="button"
        aria-label={`String ${string} up a semitone`}
        disabled={pitch >= PITCH_MAX}
        onClick={() => tuning.tune(string, 1)}
      >
        +
      </button>
    </div>
  );
}

/** Tuning preset, a semitone up or down for each string, and the capo; `children` join the first row. */
export function TuningControls({ presets, tuning, names, children }: TuningControlsProps) {
  const current = presetIdFor(tuning.strings, presets);
  const options = presets.map((p): [string, string] => [p.id, p.label]);
  if (current === CUSTOM) options.push([CUSTOM, "Custom"]);
  return (
    <div className="controls guitar-controls">
      <Select
        label="Guitar tuning"
        value={current}
        options={options}
        onChange={(id) => id !== CUSTOM && tuning.choosePreset(id)}
      />
      <label className="control">
        Capo
        <input
          type="number"
          min={0}
          max={CAPO_MAX}
          value={tuning.capo}
          onChange={(event) => tuning.setCapo(event.target.valueAsNumber)}
        />
      </label>
      {children}
      <details className="tuning-tweak" open>
        <summary>Fine-tune strings</summary>
        <div className="string-tunings">
          {tuning.strings.map((pitch, i) => (
            <StringTuning
              // biome-ignore lint/suspicious/noArrayIndexKey: the strings are a fixed list of six
              key={i}
              string={i + 1}
              pitch={pitch}
              name={names[pitch % 24]?.label ?? ""}
              tuning={tuning}
            />
          ))}
        </div>
      </details>
    </div>
  );
}
