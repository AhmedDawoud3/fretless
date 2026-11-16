import { defineDrill } from "../defineDrill";
import { checkMaqam, type MaqamResult } from "./check";
import { describeMaqam } from "./describeMaqam";
import { MaqamEarView } from "./MaqamEarView";
import { type MaqamQuestion, makeMaqamQuestion, maqamItemKey } from "./question";

/** Drill D: hear a scale, name the maqam. */
export const maqamEar = defineDrill<MaqamQuestion, string, MaqamResult>({
  id: "maqam-ear",
  title: "Maqam by ear",
  blurb: "A scale plays up and down. Which maqam is it?",
  levels: [
    { level: 1, label: "Ajam, Nahawand, Hijaz on their usual roots" },
    { level: 2, label: "Adds Kurd, Rast, Bayati (quarter tones)" },
    { level: 3, label: "All eight, on any root" },
  ],
  makeQuestion: makeMaqamQuestion,
  itemKey: maqamItemKey,
  check: checkMaqam,
  describe: describeMaqam,
  View: MaqamEarView,
});
