import { useState } from "react";
import type { ChordMatch, GuitarTuning, Quality } from "../api/client";
import type { PageProps } from "../app/useSharedSettings";
import { rootOptions } from "../explorer/rootOptions";
import { ChordPicker } from "./ChordPicker";
import { ChordResult } from "./ChordResult";
import { GuitarPanel } from "./GuitarPanel";
import { type ChordChoice, useChord } from "./useChord";

type ChordsViewProps = PageProps & {
  qualities: readonly Quality[];
  presets: readonly GuitarTuning[];
};

/** Chord roots are the even pitch classes: the twelve notes a guitar has. */
const isChordRoot = (option: { value: number }) => option.value % 2 === 0;

/** The chord page once its lists are loaded: pick by name or by shape, see it on the oud. */
export function ChordsView({ shared, neck, qualities, presets }: ChordsViewProps) {
  const [choice, setChoice] = useState<ChordChoice>({
    root: 0,
    qualityId: qualities[0]?.id ?? "",
  });
  const { chord, failed, key } = useChord(choice, shared.tuningId ?? neck.tuning.id);
  const names = rootOptions(neck.locations, shared.system);
  const chooseMatch = (m: ChordMatch) => setChoice({ root: m.root, qualityId: m.quality_id });
  return (
    <>
      <ChordPicker
        roots={names.filter(isChordRoot)}
        qualities={qualities}
        choice={choice}
        system={shared.system}
        onChoice={setChoice}
      />
      <GuitarPanel
        presets={presets}
        names={names}
        system={shared.system}
        choice={choice}
        onChoose={chooseMatch}
      />
      {failed && (
        <p className="status status-error" role="alert">
          Could not load this chord.
        </p>
      )}
      {chord && (
        <ChordResult
          key={key}
          shared={shared}
          neck={neck}
          chord={chord}
          quality={qualities.find((q) => q.id === choice.qualityId)}
        />
      )}
    </>
  );
}
