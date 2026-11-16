import { useCallback } from "react";
import { OudNeck } from "../../neck/OudNeck";
import type { DrillViewProps } from "../drill";
import { usePlayOnce } from "../usePlayOnce";
import type { EchoAnswer, EchoResult } from "./check";
import { EchoActions, ReferenceLine } from "./EchoControls";
import { echoMarkers } from "./echoMarkers";
import { playEcho } from "./playEcho";
import type { EchoQuestion } from "./question";
import { useEchoPresses } from "./useEchoPresses";

/**
 * Plays an open course and a hidden note above it. The user presses the oud until the note is
 * found; every press sounds and says higher, lower or that is it. Snap is always on.
 */
export function EchoView({
  context,
  question,
  result,
  onAnswer,
}: DrillViewProps<EchoQuestion, EchoAnswer, EchoResult>) {
  const { reference, target } = question;
  const { press, tries, hint, lastPlay } = useEchoPresses(question, result, onAnswer);
  const hearAgain = useCallback(() => playEcho(reference, target), [reference, target]);
  usePlayOnce(question, hearAgain);
  return (
    <>
      <p className="drill-prompt">Hear the reference, then find the note that follows it.</p>
      <ReferenceLine context={context} reference={reference} />
      <EchoActions
        answered={result !== null}
        tries={tries}
        onAgain={hearAgain}
        onGiveUp={() => onAnswer({ pitch: null, tries })}
      />
      <p className="echo-hint" aria-live="polite">
        {hint}
      </p>
      <div className="neck-scroll">
        <OudNeck
          neck={context.neck}
          markers={echoMarkers(context, question, lastPlay, result)}
          showGuides={context.guides}
          snap
          onPlay={press}
        />
      </div>
    </>
  );
}
