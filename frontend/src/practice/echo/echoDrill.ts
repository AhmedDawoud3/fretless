import { defineDrill } from "../defineDrill";
import { checkEcho, type EchoAnswer, type EchoResult } from "./check";
import { describeEcho } from "./describeEcho";
import { EchoView } from "./EchoView";
import { type EchoQuestion, echoItemKey, makeEchoQuestion } from "./question";

/** Drill C: hear a note, find it on the oud. */
export const echoDrill = defineDrill<EchoQuestion, EchoAnswer, EchoResult>({
  id: "echo",
  title: "Echo: hear it, find it",
  blurb: "An open course plays, then a hidden note. Find that note on the oud by ear.",
  levels: [
    { level: 1, label: "Natural notes within a fifth" },
    { level: 2, label: "Any twelve-tone note within an octave" },
    { level: 3, label: "Includes quarter tones" },
  ],
  makeQuestion: makeEchoQuestion,
  itemKey: echoItemKey,
  check: checkEcho,
  describe: describeEcho,
  View: EchoView,
});
