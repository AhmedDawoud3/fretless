import type { GuitarTuning } from "../api/client";
import type { PageProps } from "../app/useSharedSettings";
import { useGuitarTuning } from "../chords/useGuitarTuning";
import { rootOptions } from "../explorer/rootOptions";
import { TabInput } from "./TabInput";
import { TabResult } from "./TabResult";
import { type Conversion, useConversion } from "./useConversion";
import { useTabInput } from "./useTabInput";

const REJECTED =
  "The converter could not take that text. It needs between 1 and 200,000 characters.";
const FAILED = "Could not convert the tab. Start the backend with `just api`, then press Convert.";

type OutcomeProps = PageProps & { conversion: Conversion; inputKey: string };

function Outcome({ conversion, inputKey, ...page }: OutcomeProps) {
  if (conversion.status === "loading") return <p className="status">Converting...</p>;
  if (conversion.status === "done") {
    return <TabResult converted={conversion.converted} inputKey={inputKey} {...page} />;
  }
  if (conversion.status === "idle") return null;
  const message = conversion.status === "rejected" ? REJECTED : FAILED;
  return (
    <p className="status status-error" role="alert">
      {message}
    </p>
  );
}

/** Guitar tab to oud tab: paste, pick the guitar, convert. */
export function TabView({
  shared,
  neck,
  presets,
}: PageProps & { presets: readonly GuitarTuning[] }) {
  const tuning = useGuitarTuning(presets);
  const input = useTabInput();
  const tuningId = shared.tuningId ?? neck.tuning.id;
  const { conversion, convert } = useConversion({
    ...{ strings: tuning.strings, capo: tuning.capo, mode: input.mode, tuningId },
  });
  const inputKey = JSON.stringify([input.text, tuning.strings, tuning.capo, input.mode, tuningId]);
  return (
    <>
      <TabInput
        {...{ presets, tuning }}
        {...{ text: input.text, onText: input.setText, tooLong: input.tooLong }}
        {...{ mode: input.mode, onMode: input.setMode }}
        names={rootOptions(neck.locations, shared.system)}
        onConvert={() => convert(input.text)}
      />
      <Outcome {...{ shared, neck, conversion, inputKey }} />
    </>
  );
}
