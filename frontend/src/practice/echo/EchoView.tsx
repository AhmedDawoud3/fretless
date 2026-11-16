import { useCallback, useState } from "react";
import { playSteps } from "../../audio";
import { OudNeck } from "../../neck/OudNeck";
import type { Play } from "../../neck/play";
import type { DrillViewProps } from "../drill";
import { layered, noteMarker } from "../markers";
import { nameOfPitch } from "../neckLookup";
import { spokenName } from "../spokenName";
import { usePlayOnce } from "../usePlayOnce";
import { type EchoAnswer, type EchoResult, hintFor } from "./check";
import { playEcho } from "./playEcho";
import type { EchoQuestion } from "./question";

type Press = { play: Play; tries: number };

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
  const { neck, system } = context;
  const { reference, target } = question;
  const [last, setLast] = useState<Press | null>(null);
  const tries = last?.tries ?? 0;
  const hearAgain = useCallback(() => playEcho(reference, target), [reference, target]);
  usePlayOnce(question, hearAgain);

  const press = (play: Play) => {
    playSteps(play.pitch);
    if (result) return;
    const count = tries + 1;
    setLast({ play, tries: count });
    if (play.pitch === target) onAnswer({ pitch: play.pitch, tries: count });
  };

  const referenceName = nameOfPitch(neck, reference);
  const referenceSpot = neck.courses.find((c) => c.open_pitch === reference);
  const base = referenceSpot
    ? [noteMarker(neck, system, { course: referenceSpot.course, position: 0 }, "root")]
    : [];
  const pressed = last ? [noteMarker(neck, system, last.play, "normal")] : [];
  const lit = result
    ? neck.locations
        .filter((l) => l.pitch === target)
        .map((l) => noteMarker(neck, system, l, "active"))
    : [];
  return (
    <>
      <p className="drill-prompt">Hear the reference, then find the note that follows it.</p>
      <p>
        Reference: <strong>{referenceName ? spokenName(referenceName, system) : "?"}</strong>
        {referenceSpot && ` (open course ${referenceSpot.course})`}
      </p>
      <p className="drill-actions">
        <button type="button" onClick={hearAgain}>
          Hear it again
        </button>
        <button
          type="button"
          disabled={result !== null}
          onClick={() => onAnswer({ pitch: null, tries })}
        >
          Show me
        </button>
        <span>Tries: {tries}</span>
      </p>
      <p className="echo-hint" aria-live="polite">
        {last && !result ? hintFor(question, last.play.pitch) : ""}
      </p>
      <div className="neck-scroll">
        <OudNeck
          neck={neck}
          markers={layered(base, pressed, lit)}
          showGuides={context.guides}
          snap
          onPlay={press}
        />
      </div>
    </>
  );
}
