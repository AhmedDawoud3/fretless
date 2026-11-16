import { useCallback } from "react";
import { OudNeck } from "../../neck/OudNeck";
import type { DrillViewProps } from "../drill";
import { noteMarker } from "../markers";
import { lowestLocation } from "../neckLookup";
import { useOptionKeys } from "../useOptionKeys";
import { usePlayOnce } from "../usePlayOnce";
import type { IntervalResult } from "./check";
import { IntervalOptions } from "./IntervalOptions";
import { playInterval } from "./playInterval";
import type { IntervalQuestion } from "./question";

/** Plays two notes and asks for the interval. Once answered, shows both notes at their lowest places on the oud. */
export function IntervalView({
  context,
  question,
  result,
  onAnswer,
}: DrillViewProps<IntervalQuestion, string, IntervalResult>) {
  const { neck, system, guides } = context;
  const { low, interval, options } = question;
  const high = low + interval.steps;
  const replay = useCallback(() => playInterval(low, high, false), [low, high]);
  usePlayOnce(question, replay);
  useOptionKeys(result === null, options.length, (place) => {
    const chosen = options[place];
    if (chosen) onAnswer(chosen.id);
  });
  const lowSpot = lowestLocation(neck, low);
  const highSpot = lowestLocation(neck, high);
  return (
    <>
      <p className="drill-prompt">Listen to the two notes. Which interval is it?</p>
      <p className="drill-actions">
        <button type="button" onClick={replay}>
          Play again
        </button>
        <button type="button" onClick={() => playInterval(low, high, true)}>
          Together
        </button>
      </p>
      <IntervalOptions
        options={options}
        answered={result && { right: interval.id, chosen: result.chosen }}
        onChoose={onAnswer}
      />
      {result && lowSpot && highSpot && (
        <div className="neck-scroll">
          <OudNeck
            neck={neck}
            markers={[
              noteMarker(neck, system, lowSpot, "root"),
              noteMarker(neck, system, highSpot, "active"),
            ]}
            showGuides={guides}
            snap
          />
        </div>
      )}
    </>
  );
}
