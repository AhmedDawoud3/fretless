import type { ScaleLocation } from "../api/client";
import { positionToX } from "../neck/geometry";
import { NECK_LAYOUT } from "../neck/layout";
import type { Marker } from "../neck/MarkerDots";
import { pillWidth } from "../neck/pill";
import { formatNoteName, type NamingSystem } from "../notation/noteName";
import { formatVirtualFret } from "../notation/virtualFret";
import { type LabelMode, markerLabel } from "./readout";

type Spot = { course: number; position: number };

/** A bare dot is this wide, so a pill next to it must clear it too. */
const DOT_WIDTH = 16;

/** Label to try first, then simpler ones, until the label fits beside its neighbour. */
const FALLBACKS: Record<LabelMode, readonly LabelMode[]> = {
  both: ["both", "names", "none"],
  names: ["names", "none"],
  frets: ["frets", "none"],
  none: ["none"],
};

const widthOf = (label: string | undefined) => (label ? pillWidth(label, true) : DOT_WIDTH);

function labelFor(location: ScaleLocation, mode: LabelMode, system: NamingSystem) {
  return markerLabel(
    {
      course: location.course,
      fret: formatVirtualFret(location.position),
      name: formatNoteName(location.name, system),
      cents: 0,
    },
    mode,
  );
}

type Previous = { x: number; label: string | undefined };

function fitLabel(
  location: ScaleLocation,
  mode: LabelMode,
  system: NamingSystem,
  previous: Previous | undefined,
): string | undefined {
  const x = positionToX(NECK_LAYOUT, location.position);
  const fits = (label: string | undefined) =>
    !previous || x - previous.x >= (widthOf(label) + widthOf(previous.label)) / 2;
  for (const candidate of FALLBACKS[mode]) {
    const label = labelFor(location, candidate, system);
    if (fits(label)) return label;
  }
  return undefined;
}

/**
 * One marker per scale location, root in its own tone. Labels are dropped to the
 * bare name, then to nothing, wherever the full label would overlap the one before it.
 */
export function scaleMarkers(
  locations: readonly ScaleLocation[],
  mode: LabelMode,
  system: NamingSystem,
): Marker[] {
  const sorted = [...locations].sort((a, b) => a.course - b.course || a.position - b.position);
  const markers: Marker[] = [];
  let previous: Previous | undefined;
  for (const [i, location] of sorted.entries()) {
    const sameCourse = sorted[i - 1]?.course === location.course;
    const label = fitLabel(location, mode, system, sameCourse ? previous : undefined);
    previous = { x: positionToX(NECK_LAYOUT, location.position), label };
    markers.push({
      course: location.course,
      position: location.position,
      label,
      tone: location.degree === 1 ? "root" : "normal",
      compact: true,
    });
  }
  return markers;
}

const isAt = (marker: Marker, spot: Spot) =>
  marker.course === spot.course && marker.position === spot.position;

/** Adds `extra` (e.g. the last played note), replacing a marker at the same spot. */
export function withMarker(markers: Marker[], extra: Marker | null): Marker[] {
  if (!extra) return markers;
  return [...markers.filter((m) => !isAt(m, extra)), extra];
}

/** The marker at `spot` becomes the active one (the note being played back). */
export function highlightAt(markers: Marker[], spot: Spot | null): Marker[] {
  if (!spot) return markers;
  return markers.map((m) => (isAt(m, spot) ? { ...m, tone: "active" } : m));
}
