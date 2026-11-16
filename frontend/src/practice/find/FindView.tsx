import { playSteps } from "../../audio";
import { OudNeck } from "../../neck/OudNeck";
import type { Play } from "../../neck/play";
import type { DrillViewProps } from "../drill";
import { spokenName } from "../spokenName";
import type { FindResult } from "./check";
import { findMarkers } from "./findMarkers";
import type { FindQuestion } from "./question";

/** Shows the note to find and the oud to press. Snap is always on here, and the guide marks are shown. */
export function FindView({
  context,
  question,
  result,
  onAnswer,
}: DrillViewProps<FindQuestion, Play, FindResult>) {
  const press = (play: Play) => {
    playSteps(play.pitch);
    if (!result) onAnswer(play);
  };
  return (
    <>
      <p className="drill-prompt">
        Find <strong>{spokenName(question.name, context.system)}</strong>{" "}
        {question.course === null ? "anywhere" : `on course ${question.course}`}
      </p>
      <div className="neck-scroll">
        <OudNeck
          neck={context.neck}
          markers={findMarkers(context, question, result)}
          showGuides
          snap
          onPlay={press}
        />
      </div>
    </>
  );
}
