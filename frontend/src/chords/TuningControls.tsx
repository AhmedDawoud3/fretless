import type { GuitarTuning } from "../api/client";
import type { RootOption } from "../explorer/rootOptions";
import { Select } from "../explorer/Select";
import { CAPO_MAX, PITCH_MAX, PITCH_MIN } from "./shape";
import { CUSTOM, presetIdFor } from "./tuningPreset";
import type { GuitarShape } from "./useGuitarShape";

type TuningControlsProps = {
  presets: readonly GuitarTuning[];
  shape: GuitarShape;
  /** Names of the pitch classes in the chosen naming system, to name each open string. */
  names: readonly RootOption[];
};

function StringTuning({
  string,
  pitch,
  name,
  shape,
}: {
  string: number;
  pitch: number;
  name: string;
  shape: GuitarShape;
}) {
  return (
    <div className="string-tuning">
      <button
        type="button"
        aria-label={`String ${string} down a semitone`}
        disabled={pitch <= PITCH_MIN}
        onClick={() => shape.tune(string, -1)}
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
        onClick={() => shape.tune(string, 1)}
      >
        +
      </button>
    </div>
  );
}

/** Tuning preset, a semitone up or down for each string, and the capo. */
export function TuningControls({ presets, shape, names }: TuningControlsProps) {
  const current = presetIdFor(shape.strings, presets);
  const options = presets.map((p): [string, string] => [p.id, p.label]);
  if (current === CUSTOM) options.push([CUSTOM, "Custom"]);
  return (
    <div className="controls guitar-controls">
      <Select
        label="Guitar tuning"
        value={current}
        options={options}
        onChange={(id) => id !== CUSTOM && shape.choosePreset(id)}
      />
      <label className="control">
        Capo
        <input
          type="number"
          min={0}
          max={CAPO_MAX}
          value={shape.capo}
          onChange={(event) => shape.setCapo(event.target.valueAsNumber)}
        />
      </label>
      <button type="button" onClick={shape.clear}>
        Clear
      </button>
      <div className="string-tunings">
        {shape.strings.map((pitch, i) => (
          <StringTuning
            // biome-ignore lint/suspicious/noArrayIndexKey: the strings are a fixed list of six
            key={i}
            string={i + 1}
            pitch={pitch}
            name={names[pitch % 24]?.label ?? ""}
            shape={shape}
          />
        ))}
      </div>
    </div>
  );
}
