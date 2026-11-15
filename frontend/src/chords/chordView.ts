import type { ChordResult, RoleLocation, Voicing } from "../api/client";
import type { NeckNote } from "../explorer/labelledMarkers";
import { formatNoteName, type NamingSystem } from "../notation/noteName";
import { formatVirtualFret } from "../notation/virtualFret";

export function toNeckNotes(locations: readonly RoleLocation[]): NeckNote[] {
  return locations.map((l) => ({ ...l, root: l.role === "root" }));
}

const byPitch = (a: RoleLocation, b: RoleLocation) => a.pitch - b.pitch;

function describeNote(location: RoleLocation, system: NamingSystem): string {
  const where = location.position === 0 ? "open" : `fret ${formatVirtualFret(location.position)}`;
  return `${formatNoteName(location.name, system)}: course ${location.course}, ${where}`;
}

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;

/** A voicing as the card shows it: notes low to high with course and fret, then tags. */
export function describeVoicing(voicing: Voicing, system: NamingSystem) {
  const tags = [
    ...(voicing.bass_is_root ? ["root in bass"] : []),
    ...(voicing.open_courses > 0 ? [`${plural(voicing.open_courses, "open course")}`] : []),
  ];
  return { notes: [...voicing.locations].sort(byPitch).map((l) => describeNote(l, system)), tags };
}

/** "C root, E third, G fifth". */
export function chordTonesText(tones: ChordResult["chord"]["tones"], system: NamingSystem): string {
  return tones.map((t) => `${formatNoteName({ ...t, octave: 0 }, system)} ${t.role}`).join(", ");
}

export type View = "voicings" | "tones";

/** What the oud shows: the chosen voicing's notes, or every chord tone. */
export function shownLocations(view: View, chord: ChordResult, selected: number): RoleLocation[] {
  return view === "voicings" ? (chord.voicings[selected]?.locations ?? []) : chord.locations;
}
