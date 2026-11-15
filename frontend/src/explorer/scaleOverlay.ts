import type { ScaleLocation } from "../api/client";
import type { Marker } from "../neck/MarkerDots";
import type { NamingSystem } from "../notation/noteName";
import { labelledMarkers } from "./labelledMarkers";
import type { LabelMode } from "./readout";

type Spot = { course: number; position: number };

/** One marker per scale location, the root (degree 1) in its own tone. */
export function scaleMarkers(
  locations: readonly ScaleLocation[],
  mode: LabelMode,
  system: NamingSystem,
): Marker[] {
  return labelledMarkers(
    locations.map((l) => ({ ...l, root: l.degree === 1 })),
    mode,
    system,
  );
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
