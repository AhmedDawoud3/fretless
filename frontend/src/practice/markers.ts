import type { NeckOut } from "../api/client";
import type { Marker } from "../neck/OudNeck";
import { formatNoteName, type NamingSystem } from "../notation/noteName";
import { locationAt } from "./neckLookup";

/** A labelled marker for a place on the neck; its label is the note's name in the chosen system. */
export function noteMarker(
  neck: NeckOut,
  system: NamingSystem,
  spot: { course: number; position: number },
  tone: Marker["tone"],
): Marker {
  const name = locationAt(neck, spot.course, spot.position)?.name;
  return {
    course: spot.course,
    position: spot.position,
    tone,
    label: name && formatNoteName(name, system),
  };
}

/** Markers from several layers, one per place: where layers overlap the later one wins. */
export function layered(...layers: readonly (readonly Marker[])[]): Marker[] {
  const byPlace = new Map<string, Marker>();
  for (const marker of layers.flat()) byPlace.set(`${marker.course}-${marker.position}`, marker);
  return [...byPlace.values()];
}
