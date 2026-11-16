import type { Tuning } from "../api/client";
import type { NamingSystem } from "../notation/noteName";
import type { LabelMode } from "./readout";
import { Select } from "./Select";

export type ControlsProps = {
  tunings: readonly Tuning[];
  tuningId: string | null;
  onTuning: (id: string) => void;
  snap: boolean;
  onSnap: (value: boolean) => void;
  guides: boolean;
  onGuides: (value: boolean) => void;
  labelMode: LabelMode;
  onLabelMode: (mode: LabelMode) => void;
  system: NamingSystem;
  onSystem: (system: NamingSystem) => void;
  /** The page forces snap itself, so the shared choice would do nothing. */
  hideSnap?: boolean;
};

const LABEL_MODES: readonly [LabelMode, string][] = [
  ["frets", "Fret numbers"],
  ["names", "Note names"],
  ["both", "Both"],
  ["none", "None"],
];

const SYSTEMS: readonly [NamingSystem, string][] = [
  ["letters", "C D E"],
  ["solfege", "Do Re Mi"],
];

type CheckProps = { label: string; checked: boolean; onChange: (value: boolean) => void };

function Check({ label, checked, onChange }: CheckProps) {
  return (
    <label className="control">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export function Controls(props: ControlsProps) {
  const tuningOptions = props.tunings.map((t): [string, string] => [t.id, t.label]);
  return (
    <div className="controls">
      <Select
        label="Tuning"
        value={props.tuningId ?? ""}
        options={tuningOptions}
        onChange={props.onTuning}
      />
      <Select
        label="Labels"
        value={props.labelMode}
        options={LABEL_MODES}
        onChange={props.onLabelMode}
      />
      <Select label="Note names" value={props.system} options={SYSTEMS} onChange={props.onSystem} />
      {!props.hideSnap && (
        <Check label="Snap to quarter tones" checked={props.snap} onChange={props.onSnap} />
      )}
      <Check label="Guide marks" checked={props.guides} onChange={props.onGuides} />
    </div>
  );
}
