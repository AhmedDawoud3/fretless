import { useCallback } from "react";
import { fetchScale } from "../../api/client";
import { useRequest } from "../../app/useRequest";
import { scaleMarkers } from "../../explorer/scaleOverlay";
import { OudNeck } from "../../neck/OudNeck";
import type { DrillViewProps } from "../drill";
import { useOptionKeys } from "../useOptionKeys";
import { usePlayOnce } from "../usePlayOnce";
import type { MaqamResult } from "./check";
import { MaqamOptions } from "./MaqamOptions";
import type { MaqamQuestion } from "./question";
import { NORMAL_TEMPO, SLOW_TEMPO, useScalePlayer } from "./useScalePlayer";

/** Loads the scale, plays it, asks which maqam it was; once answered shows the scale on the oud. */
export function MaqamEarView({
  context,
  question,
  result,
  onAnswer,
  onSkip,
}: DrillViewProps<MaqamQuestion, string, MaqamResult>) {
  const { maqam, root, options } = question;
  const tuningId = context.neck.tuning.id;
  const { value: scale, failed } = useRequest(`${maqam.id}|${root}|${tuningId}`, () =>
    fetchScale(maqam.id, root, tuningId),
  );
  const playScale = useScalePlayer(scale);
  const replay = useCallback(() => playScale(NORMAL_TEMPO), [playScale]);
  usePlayOnce(scale, replay);
  useOptionKeys(scale !== null && result === null, options.length, (place) => {
    const chosen = options[place];
    if (chosen) onAnswer(chosen.id);
  });

  if (failed) {
    return (
      <>
        <p role="alert">Could not load this scale. Is the backend running?</p>
        <button type="button" onClick={onSkip}>
          Skip this question
        </button>
      </>
    );
  }
  if (!scale) return <p className="status">Loading the scale...</p>;
  return (
    <>
      <p className="drill-prompt">Listen to the scale, up and down. Which maqam is it?</p>
      <p className="drill-actions">
        <button type="button" onClick={replay}>
          Play again
        </button>
        <button type="button" onClick={() => playScale(SLOW_TEMPO)}>
          Slow
        </button>
      </p>
      <MaqamOptions
        options={options}
        answered={result && { right: maqam.id, chosen: result.chosen }}
        onChoose={onAnswer}
      />
      {result && (
        <div className="neck-scroll">
          <OudNeck
            neck={context.neck}
            markers={scaleMarkers(scale.locations, "names", context.system)}
            showGuides={context.guides}
            snap
          />
        </div>
      )}
    </>
  );
}
