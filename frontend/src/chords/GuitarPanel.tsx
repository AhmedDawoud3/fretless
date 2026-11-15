import type { ChordMatch, GuitarTuning } from "../api/client";
import { playSteps, playStrum } from "../audio";
import type { RootOption } from "../explorer/rootOptions";
import type { NamingSystem } from "../notation/noteName";
import { GuitarNeck } from "./GuitarNeck";
import { IdentifyResults } from "./IdentifyResults";
import { soundingPitch } from "./shape";
import { TuningControls } from "./TuningControls";
import type { ChordChoice } from "./useChord";
import { useGuitarShape } from "./useGuitarShape";
import { useIdentify } from "./useIdentify";

type GuitarPanelProps = {
  presets: readonly GuitarTuning[];
  names: readonly RootOption[];
  system: NamingSystem;
  choice: ChordChoice;
  onChoose: (match: ChordMatch) => void;
};

/** Enter a shape on a guitar neck; the page names it and offers the matching chords. */
export function GuitarPanel({ presets, names, system, choice, onChoose }: GuitarPanelProps) {
  const shape = useGuitarShape(presets);
  const { identified, failed } = useIdentify(shape);
  const press = (string: number, fret: number) => {
    shape.press(string, fret);
    playSteps(soundingPitch(shape.strings[string - 1] ?? 0, shape.capo, fret));
  };
  const strum = () =>
    playStrum((identified?.notes ?? []).map((n) => n.pitch).sort((a, b) => a - b));
  return (
    <section className="guitar-panel" aria-label="Guitar shape">
      <h2>Or click the shape you know</h2>
      <TuningControls presets={presets} shape={shape} names={names} />
      <div className="guitar-scroll">
        <GuitarNeck frets={shape.frets} capo={shape.capo} onFret={press} onNut={shape.nut} />
      </div>
      <IdentifyResults {...{ identified, failed, system, choice, onChoose }} onStrum={strum} />
    </section>
  );
}
