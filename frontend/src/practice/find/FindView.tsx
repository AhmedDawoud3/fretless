import { playSteps } from "../../audio";
import { OudNeck } from "../../neck/OudNeck";
import type { Play } from "../../neck/play";
import type { DrillViewProps } from "../drill";
import { layered, noteMarker } from "../markers";
import { spokenName } from "../spokenName";
import type { FindResult } from "./check";
import type { FindQuestion } from "./question";

/** Shows the note to find and the oud to press. Snap is always on here, and the guide marks are shown. */
export function FindView({
  context,
  question,
  result,
  onAnswer,
}: DrillViewProps<FindQuestion, Play, FindResult>) {
  const { neck, system } = context;
  const lit = result ? question.targets.map((t) => noteMarker(neck, system, t, "active")) : [];
  const pressed = result ? [noteMarker(neck, system, result.pressed, "root")] : [];
  const press = (play: Play) => {
    playSteps(play.pitch);
    if (!result) onAnswer(play);
  };
  return (
    <>
      <p className="drill-prompt">
        Find <strong>{spokenName(question.name, system)}</strong>{" "}
        {question.course === null ? "anywhere" : `on course ${question.course}`}
      </p>
      <div className="neck-scroll">
        <OudNeck
          neck={neck}
          markers={result?.correct ? lit : layered(lit, pressed)}
          showGuides
          snap
          onPlay={press}
        />
      </div>
    </>
  );
}
