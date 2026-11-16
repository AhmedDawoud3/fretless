import { useState } from "react";
import type { Converted } from "../api/client";
import type { PageProps } from "../app/useSharedSettings";
import { DEFAULT_TEMPO } from "../explorer/tempo";
import { AlterationList } from "./AlterationList";
import { CopyButton } from "./CopyButton";
import { eventMarkers } from "./eventMarkers";
import { summaryLine } from "./summary";
import { TabPlayer } from "./TabPlayer";
import { TabText } from "./TabText";
import { useTabPlayer } from "./useTabPlayer";

const NO_TAB = "No guitar tab found in that text. A tab line looks like  e|--0--3--|";

type TabResultProps = PageProps & {
  converted: Converted;
  /** Names the inputs behind this result: when it changes, playback stops. */
  inputKey: string;
};

/** The converted tab with what changed, and the oud playing it; or, if no tab was found, how a tab line looks. */
export function TabResult({ converted, shared, neck, inputKey }: TabResultProps) {
  const [speed, setSpeed] = useState(DEFAULT_TEMPO);
  const player = useTabPlayer(converted.playback, speed, inputKey);
  if (converted.systems.length === 0) return <p className="status">{NO_TAB}</p>;
  return (
    <section className="tab-result" aria-label="Conversion result">
      <p className="tab-summary">{summaryLine(converted.summary)}</p>
      <AlterationList
        alterations={converted.alterations}
        systems={converted.systems}
        onPick={player.pick}
      />
      <CopyButton text={converted.text} />
      <section className="tab-output" aria-label="Converted tab">
        <TabText
          text={converted.text}
          systems={converted.systems}
          activeKey={player.currentKey}
          onPick={player.pick}
        />
      </section>
      <TabPlayer
        neck={neck}
        markers={eventMarkers(player.current, converted.systems, shared.labelMode)}
        playing={player.playing}
        onToggle={player.toggle}
        speed={speed}
        onSpeed={setSpeed}
        guides={shared.guides}
        snap={shared.snap}
        labelMode={shared.labelMode}
      />
    </section>
  );
}
