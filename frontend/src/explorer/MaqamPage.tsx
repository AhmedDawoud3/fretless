import type { PageProps } from "../app/useSharedSettings";
import { OudNeck } from "../neck/OudNeck";
import { MaqamControls } from "./MaqamControls";
import { MaqamPanel } from "./MaqamPanel";
import { ReadoutLine } from "./ReadoutLine";
import { rulerLabelFor } from "./readout";
import { useExplorer } from "./useExplorer";
import { WhyNote } from "./WhyNote";

/** Maqam explorer: pick a maqam and a root, see its notes on the oud, hear it. */
export function MaqamPage({ shared, neck }: PageProps) {
  const x = useExplorer(shared, neck);
  return (
    <>
      <MaqamControls
        maqam={x.maqam}
        neck={neck}
        system={shared.system}
        playback={{ playing: x.playback.playing, toggle: x.togglePlayback }}
        tempo={x.tempo}
        onTempo={x.setTempo}
      />
      <ReadoutLine readout={x.readout} />
      <div className="neck-scroll studio-stage">
        <OudNeck
          neck={neck}
          markers={x.markers}
          showGuides={shared.guides}
          snap={shared.snap}
          zoom={shared.neckZoom}
          system={shared.system}
          onPlay={x.play}
          rulerLabel={rulerLabelFor(shared.guides, shared.labelMode)}
        />
      </div>
      {x.maqam.maqam ? (
        <MaqamPanel
          maqam={x.maqam.maqam}
          scale={x.maqam.scale}
          failed={x.maqam.scaleFailed}
          intervals={shared.intervals}
          system={shared.system}
        />
      ) : (
        <WhyNote />
      )}
    </>
  );
}
