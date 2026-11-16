import type { Converted } from "../api/client";

const note = (course: number, position: number, pitch: number, name: string) => ({
  course,
  position,
  pitch,
  name,
});

/** A converted tab as the API answers it: two events, the second a chord that lost a note. */
export const CONVERTED: Converted = {
  text: ["C|--3-5-|", "F|------|", "A|----0-|", "D|------|", "G|------|", "C|------|"].join("\n"),
  systems: [
    {
      index: 0,
      width: 6,
      bars: [],
      labels: ["C", "F", "A", "D", "G", "C"],
      columns: [
        { index: 2, notes: [note(1, 6, 102, "F")] },
        { index: 4, notes: [note(1, 10, 106, "A"), note(3, 0, 86, "A")] },
      ],
    },
  ],
  alterations: [
    { kind: "chord_reduced", system: 0, column: 4, message: "1 chord note left out." },
    { kind: "transposed", system: null, column: null, message: "Whole piece moved down." },
  ],
  playback: [
    { system: 0, column: 2, tick: 2, notes: [{ pitch: 102, course: 1, position: 6 }] },
    {
      system: 0,
      column: 4,
      tick: 4,
      notes: [
        { pitch: 106, course: 1, position: 10 },
        { pitch: 86, course: 3, position: 0 },
      ],
    },
  ],
  summary: {
    notes_in: 4,
    notes_out: 3,
    transposed_steps: -24,
    octave_shifted: 0,
    chords_reduced: 1,
    unsupported_systems: 0,
  },
  guitar_systems: [
    {
      index: 0,
      width: 6,
      bars: [],
      labels: ["E", "B", "G", "D", "A", "E"],
      columns: [
        { index: 2, notes: [note(1, 1, 106, "F")] },
        { index: 4, notes: [note(1, 5, 114, "A"), note(3, 2, 90, "A")] },
      ],
    },
  ],
  guitar_playback: [
    { system: 0, column: 2, tick: 2, notes: [{ pitch: 106, course: 1, position: 1 }] },
    {
      system: 0,
      column: 4,
      tick: 4,
      notes: [
        { pitch: 114, course: 1, position: 5 },
        { pitch: 90, course: 3, position: 2 },
      ],
    },
  ],
};

/** Text with no tab in it comes back unchanged and with nothing found. */
export const noTab = (text: string): Converted => ({
  text,
  systems: [],
  alterations: [],
  playback: [],
  summary: {
    ...CONVERTED.summary,
    notes_in: 0,
    notes_out: 0,
    transposed_steps: 0,
    chords_reduced: 0,
  },
  guitar_systems: [],
  guitar_playback: [],
});
