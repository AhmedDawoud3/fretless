import type { DrillEntry } from "./drill";
import { echoDrill } from "./echo/echoDrill";
import { findNote } from "./find/findNote";
import { intervalEar } from "./interval/intervalEar";

/** Every drill on the Practice page, in picker order. A new drill is one line here. */
export const DRILLS: readonly DrillEntry[] = [findNote, intervalEar, echoDrill];
