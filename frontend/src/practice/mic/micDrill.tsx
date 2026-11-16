import { defineDrill } from "../defineDrill";
import type { DrillEntry } from "../drill";
import { checkMic, type MicAnswer, type MicResult } from "./check";
import { describePlay } from "./describePlay";
import { MicScope } from "./MicScope";
import { MicView } from "./MicView";
import { type MicQuestion, makeMicQuestion, micItemKey } from "./question";

const drill = defineDrill<MicQuestion, MicAnswer, MicResult>({
  id: "mic",
  title: "Play it on your oud",
  blurb: "Play the named note on your oud. The microphone listens and shows how in tune you are.",
  levels: [
    { level: 1, label: "Open courses (also a tuning check)" },
    { level: 2, label: "Natural notes in first position" },
    { level: 3, label: "Sharps and flats" },
    { level: 4, label: "Quarter tones (half-flats)" },
  ],
  makeQuestion: makeMicQuestion,
  itemKey: micItemKey,
  check: checkMic,
  describe: describePlay,
  View: MicView,
});

/** Drill E: play a named note and be heard. The microphone lives around the shell, so it outlasts each question. */
export const micDrill: DrillEntry = {
  ...drill,
  render: (props) => (
    <MicScope neck={props.context.neck} system={props.context.system}>
      {drill.render(props)}
    </MicScope>
  ),
};
