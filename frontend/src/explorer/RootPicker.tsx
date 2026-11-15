import type { RootOption } from "./rootOptions";
import { Select } from "./Select";

type RootPickerProps = {
  options: readonly RootOption[];
  root: number;
  traditionalRoot: number;
  onRoot: (root: number) => void;
  onTraditional: () => void;
};

export function RootPicker({
  options,
  root,
  traditionalRoot,
  onRoot,
  onTraditional,
}: RootPickerProps) {
  const choices = options.map((o): [string, string] => [String(o.value), o.label]);
  return (
    <div className="control">
      <Select
        label="Root"
        value={String(root)}
        options={choices}
        onChange={(v) => onRoot(Number(v))}
      />
      <button type="button" disabled={root === traditionalRoot} onClick={onTraditional}>
        Traditional root
      </button>
    </div>
  );
}
