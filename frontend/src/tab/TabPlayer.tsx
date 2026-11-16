import type { NeckOut } from "../api/client";
import { playSteps } from "../audio";
import { PlayScale } from "../explorer/PlayScale";
import { type LabelMode, rulerLabelFor } from "../explorer/readout";
import { type Marker, OudNeck } from "../neck/OudNeck";

const WORDS = { play: "Play", rate: "Speed" };

type TabPlayerProps = {
  neck: NeckOut;
  markers: readonly Marker[];
  playing: boolean;
  onToggle: () => void;
  speed: number;
  onSpeed: (notesPerMinute: number) => void;
  guides: boolean;
  snap: boolean;
  labelMode: LabelMode;
};

/** The oud showing the event that is current, with Play and Speed. */
export function TabPlayer(props: TabPlayerProps) {
  const { neck, markers, playing, onToggle, speed, onSpeed, guides, snap, labelMode } = props;
  return (
    <section className="tab-player" aria-label="Oud view">
      <div className="controls">
        <PlayScale
          playing={playing}
          onToggle={onToggle}
          tempo={speed}
          onTempo={onSpeed}
          words={WORDS}
        />
      </div>
      <p className="tab-note">
        Text tabs carry no real rhythm: notes are spaced by how far apart they are written, so the
        speed is only approximate.
      </p>
      <div className="neck-scroll">
        <OudNeck
          neck={neck}
          markers={markers}
          showGuides={guides}
          snap={snap}
          onPlay={(hit) => playSteps(hit.pitch)}
          rulerLabel={rulerLabelFor(guides, labelMode)}
        />
      </div>
    </section>
  );
}
