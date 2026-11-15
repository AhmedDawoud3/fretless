import type { NeckOut } from "../api/client";
import type { Play } from "../neck/play";
import { formatNoteName, type NamingSystem } from "../notation/noteName";
import { formatVirtualFret } from "../notation/virtualFret";

export const LABEL_MODE_IDS = ["frets", "names", "both", "none"] as const;
export type LabelMode = (typeof LABEL_MODE_IDS)[number];
export type Readout = { course: number; fret: string; name: string; cents: number };

const CENTS_PER_STEP = 50;

/** Course, fret, and the nearest grid note with its offset in cents (one step is 50 cents). */
export function describePlay(neck: NeckOut, play: Play, system: NamingSystem): Readout | null {
  let nearest = neck.locations[0];
  for (const location of neck.locations) {
    if (!nearest || Math.abs(location.pitch - play.pitch) < Math.abs(nearest.pitch - play.pitch)) {
      nearest = location;
    }
  }
  if (!nearest) return null;
  return {
    course: play.course,
    fret: formatVirtualFret(play.position),
    name: formatNoteName(nearest.name, system, true),
    cents: Math.round((play.pitch - nearest.pitch) * CENTS_PER_STEP),
  };
}

export function formatCents(cents: number): string {
  if (cents === 0) return "";
  return `${cents > 0 ? "+" : ""}${cents} cents`;
}

export function markerLabel(readout: Readout, mode: LabelMode): string | undefined {
  const note = readout.name.replace(/\d+$/, "");
  const labels: Record<LabelMode, string | undefined> = {
    frets: readout.fret,
    names: note,
    both: `${note} ${readout.fret}`,
    none: undefined,
  };
  return labels[mode];
}

/** Fret numbers above the guides, when guides are on and the labels include frets. */
export function rulerLabelFor(guides: boolean, mode: LabelMode) {
  return guides && (mode === "frets" || mode === "both") ? formatVirtualFret : undefined;
}
