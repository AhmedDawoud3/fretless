import { useState } from "react";
import { playSteps } from "../../audio";
import type { Play } from "../../neck/play";
import { type EchoAnswer, type EchoResult, hintFor } from "./check";
import type { EchoQuestion } from "./question";

/** The presses of one question: each sounds, is counted and gets a hint; finding the target answers. */
export function useEchoPresses(
  question: EchoQuestion,
  result: EchoResult | null,
  onAnswer: (answer: EchoAnswer) => void,
) {
  const [tries, setTries] = useState(0);
  const [lastPlay, setLastPlay] = useState<Play | null>(null);

  const press = (play: Play) => {
    playSteps(play.pitch);
    if (result) return;
    setTries(tries + 1);
    setLastPlay(play);
    if (play.pitch === question.target) onAnswer({ pitch: play.pitch, tries: tries + 1 });
  };
  const hint = lastPlay === null || result ? "" : hintFor(question, lastPlay.pitch);
  return { press, tries, hint, lastPlay };
}
