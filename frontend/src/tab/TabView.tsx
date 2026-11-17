import { useState } from "react";
import type { GuitarTuning, ImportedTab } from "../api/client";
import type { PageProps } from "../app/useSharedSettings";
import { useGuitarTuning } from "../chords/useGuitarTuning";
import { rootOptions } from "../explorer/rootOptions";
import { TabExplanation } from "./TabExplanation";
import { TabInput } from "./TabInput";
import { TabResult } from "./TabResult";
import { toggleGuitarNote } from "./tabEdit";
import { type Conversion, useConversion } from "./useConversion";
import { useTabInput } from "./useTabInput";

const REJECTED =
  "The converter could not take that text. It needs between 1 and 200,000 characters.";
const FAILED = "Could not convert the tab. Start the backend with `just api`, then press Convert.";

type OutcomeProps = PageProps & {
  conversion: Conversion;
  inputKey: string;
  mode: "frets" | "names" | "both";
  tempo?: number | null;
  guitar: { strings: readonly number[]; capo: number };
  onEditGuitar: (line: number, columnIndex: number | null, fret: number) => void;
  transpose: number;
  onTranspose: (semitones: number) => void;
};

function Outcome({
  conversion,
  inputKey,
  mode,
  tempo,
  guitar,
  onEditGuitar,
  transpose,
  onTranspose,
  ...page
}: OutcomeProps) {
  if (conversion.status === "loading") return <p className="status">Converting...</p>;
  if (conversion.status === "done") {
    return (
      <TabResult
        converted={conversion.converted}
        inputKey={inputKey}
        mode={mode}
        tempo={tempo}
        guitar={guitar}
        onEditGuitar={onEditGuitar}
        transpose={transpose}
        onTranspose={onTranspose}
        {...page}
      />
    );
  }
  if (conversion.status === "idle") return null;
  const message = conversion.status === "rejected" ? REJECTED : FAILED;
  return (
    <p className="status status-error" role="alert">
      {message}
    </p>
  );
}

/** Guitar tab to oud tab: paste or edit on the neck, switch Guitar/Oud track, and play. */
export function TabView({
  shared,
  neck,
  presets,
}: PageProps & { presets: readonly GuitarTuning[] }) {
  const tuning = useGuitarTuning(presets);
  const input = useTabInput();
  const [importedTempo, setImportedTempo] = useState<number | null>(null);
  const [transpose, setTranspose] = useState(0);
  const tuningId = shared.tuningId ?? neck.tuning.id;
  const { conversion, convert } = useConversion({
    ...{ strings: tuning.strings, capo: tuning.capo, mode: input.mode, tuningId, transpose },
  });
  const inputKey = JSON.stringify([
    input.text,
    tuning.strings,
    tuning.capo,
    input.mode,
    tuningId,
    transpose,
  ]);
  const handleEditGuitar = (line: number, columnIndex: number | null, fret: number) => {
    const next = toggleGuitarNote(input.text, line, columnIndex, fret);
    input.setText(next);
    convert(next);
  };
  const handleImported = (imported: ImportedTab) => {
    input.setText(imported.text);
    if (imported.strings && imported.strings.length === 6) {
      tuning.setStrings(imported.strings);
    }
    tuning.setCapo(imported.capo);
    setImportedTempo(imported.tempo ?? null);
    setTranspose(0);
    convert(imported.text);
  };
  return (
    <>
      <TabInput
        {...{ presets, tuning }}
        {...{ text: input.text, onText: input.setText, tooLong: input.tooLong }}
        {...{ mode: input.mode, onMode: input.setMode }}
        names={rootOptions(neck.locations, shared.system)}
        onConvert={() => convert(input.text)}
        onImported={handleImported}
      />
      <Outcome
        {...{ shared, neck, conversion, inputKey, transpose }}
        mode={input.mode}
        tempo={importedTempo}
        guitar={{ strings: tuning.strings, capo: tuning.capo }}
        onEditGuitar={handleEditGuitar}
        onTranspose={setTranspose}
      />
      <TabExplanation />
    </>
  );
}
