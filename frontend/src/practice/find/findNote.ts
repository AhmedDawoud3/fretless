import type { Play } from "../../neck/play";
import { defineDrill } from "../defineDrill";
import { checkFind, type FindResult } from "./check";
import { describeFind } from "./describeFind";
import { FindView } from "./FindView";
import { type FindQuestion, findItemKey, makeFindQuestion } from "./question";

/** Drill A: name a note, press it on the oud. */
export const findNote = defineDrill<FindQuestion, Play, FindResult>({
  id: "find",
  title: "Find the note",
  blurb: "A note is named. Press where it is on the oud.",
  levels: [
    { level: 1, label: "Natural notes, first position" },
    { level: 2, label: "Sharps and flats, on a named course" },
    { level: 3, label: "Quarter tones, whole neck" },
  ],
  makeQuestion: makeFindQuestion,
  itemKey: findItemKey,
  check: checkFind,
  describe: describeFind,
  View: FindView,
});
