import type { NeckOut } from "../api/client";
import type { NamingSystem } from "../notation/noteName";
import { MaqamPicker } from "./MaqamPicker";
import { RootPicker } from "./RootPicker";
import { rootOptions } from "./rootOptions";
import type { MaqamState } from "./useMaqam";

type MaqamControlsProps = { maqam: MaqamState; neck: NeckOut; system: NamingSystem };

export function MaqamControls({ maqam, neck, system }: MaqamControlsProps) {
  if (maqam.maqamat.length === 0) return null;
  return (
    <div className="controls maqam-controls">
      <MaqamPicker
        maqamat={maqam.maqamat}
        selectedId={maqam.maqam?.id ?? null}
        onChoose={maqam.choose}
      />
      {maqam.maqam && maqam.root !== null && (
        <RootPicker
          options={rootOptions(neck.locations, system)}
          root={maqam.root}
          traditionalRoot={maqam.maqam.default_root}
          onRoot={maqam.chooseRoot}
          onTraditional={() => maqam.chooseRoot(null)}
        />
      )}
    </div>
  );
}
