import { defineDrill } from "../defineDrill";
import { checkInterval, type IntervalResult } from "./check";
import { describeInterval } from "./describeInterval";
import { IntervalView } from "./IntervalView";
import { type IntervalQuestion, intervalItemKey, makeIntervalQuestion } from "./question";

/** Drill B: hear two notes, name the interval. */
export const intervalEar = defineDrill<IntervalQuestion, string, IntervalResult>({
  id: "interval",
  title: "Interval by ear",
  blurb: "Two notes play. Name the distance between them, in guitar frets.",
  levels: [
    { level: 1, label: "Thirds, fourth, fifth, octave" },
    { level: 2, label: "Adds seconds and sixths" },
    { level: 3, label: "Adds tritone, sevenths, unison" },
    { level: 4, label: "Adds quarter-tone intervals" },
  ],
  makeQuestion: makeIntervalQuestion,
  itemKey: intervalItemKey,
  check: checkInterval,
  describe: describeInterval,
  View: IntervalView,
});
