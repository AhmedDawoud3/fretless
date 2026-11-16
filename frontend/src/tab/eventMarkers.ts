import type { ConvertedSystem, PlaybackEvent } from "../api/client";
import { type LabelMode, markerLabel } from "../explorer/readout";
import type { Marker } from "../neck/OudNeck";
import { formatVirtualFret } from "../notation/virtualFret";

/** The note names of an event, as the converted text printed them (no octave). */
function nameOf(event: PlaybackEvent, systems: readonly ConvertedSystem[], course: number) {
  const column = systems
    .find((s) => s.index === event.system)
    ?.columns.find((c) => c.index === event.column);
  return column?.notes.find((n) => n.course === course)?.name ?? "";
}

/** The notes of one event as active markers on the oud, labelled as the label mode says. */
export function eventMarkers(
  event: PlaybackEvent | null,
  systems: readonly ConvertedSystem[],
  mode: LabelMode,
): Marker[] {
  if (!event) return [];
  return event.notes.map((n) => {
    const readout = {
      course: n.course,
      fret: formatVirtualFret(n.position),
      name: nameOf(event, systems, n.course),
      cents: 0,
    };
    return {
      course: n.course,
      position: n.position,
      label: markerLabel(readout, mode),
      tone: "active",
    };
  });
}
