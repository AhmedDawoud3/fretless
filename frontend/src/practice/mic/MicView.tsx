import { OudNeck } from "../../neck/OudNeck";
import type { DrillViewProps } from "../drill";
import { noteMarker } from "../markers";
import { nameOfPitchClass } from "../neckLookup";
import { spokenName } from "../spokenName";
import type { MicAnswer, MicResult } from "./check";
import { liveWords } from "./liveWords";
import { Meter } from "./Meter";
import { useMicScope } from "./MicScope";
import type { MicQuestion } from "./question";
import { useAttempt } from "./useAttempt";

/** Names the note to play and where it is; listens; shows the meter and what to change; passes on a held note. */
export function MicView({
  context,
  question,
  result,
  onAnswer,
  onSkip,
}: DrillViewProps<MicQuestion, MicAnswer, MicResult>) {
  const { neck, system } = context;
  const { mic, tuner } = useMicScope();
  const { heard, hearIt } = useAttempt({
    reading: mic.reading,
    target: question.pitch,
    enabled: result === null && !tuner,
    onPass: onAnswer,
  });
  const spell = (pitch: number) => {
    const name = nameOfPitchClass(neck, pitch);
    return name ? spokenName(name, system) : "?";
  };
  const open = question.position === 0;
  const spot = { course: question.course, position: question.position };
  const words = result
    ? "Held it."
    : liveWords(heard, {
        listening: mic.status === "listening",
        open,
        heardName: heard.kind === "wrong" ? spell(heard.step) : "",
      });
  return (
    <>
      <p className="drill-prompt">
        Play <strong>{spell(question.pitch)}</strong> on course {question.course}
        {open ? ", open" : ""}
      </p>
      <p className="drill-actions">
        <button type="button" onClick={hearIt}>
          Hear it
        </button>
        {!result && (
          <button type="button" onClick={onSkip}>
            Skip
          </button>
        )}
      </p>
      <Meter cents={heard.kind === "tuned" ? heard.comparison.cents : null} />
      <p className="mic-words" aria-live="polite">
        {words}
      </p>
      <div className="neck-scroll">
        <OudNeck
          neck={neck}
          markers={[noteMarker(neck, system, spot, "root")]}
          showGuides={context.guides}
          snap
        />
      </div>
    </>
  );
}
