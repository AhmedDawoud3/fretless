import { vi } from "vitest";
import type {
  ChordResult,
  GuitarTuning,
  Identified,
  Maqam,
  NeckLocation,
  NeckOut,
  NoteName,
  Quality,
  Scale,
} from "./api/client";
import { CONVERTED, noTab } from "./tab/convertedFixture";

/** Letter and alter for each of the 24 pitch classes, as the neck spells them. */
const SPELLING: readonly [NeckLocation["name"]["letter"], number][] = [
  ["C", 0], ["C", 1], ["C", 2], ["D", -1], ["D", 0], ["D", 1], ["D", 2], ["E", -1],
  ["E", 0], ["E", 1], ["F", 0], ["F", 1], ["F", 2], ["G", -1], ["G", 0], ["G", 1],
  ["G", 2], ["A", -1], ["A", 0], ["A", 1], ["A", 2], ["B", -1], ["B", 0], ["B", 1],
]; // biome-ignore format: one row per half octave

export const neck: NeckOut = {
  tuning: { id: "cc", label: "C-C" },
  courses: [{ course: 1, open_pitch: 96, max_position: 24 }],
  locations: SPELLING.map(([letter, alter], position) => ({
    course: 1,
    position,
    pitch: 96 + position,
    name: { letter, alter, octave: 4 },
  })),
};

export const rast: Maqam = {
  id: "rast",
  name: "Rast",
  arabic_name: "راست",
  intervals: [4, 3, 3, 4, 4, 3, 3],
  default_root: 0,
  description: "The mother of the maqamat: bright, with two half-sharp notes.",
};

export const bayati: Maqam = {
  id: "bayati",
  name: "Bayati",
  arabic_name: "بياتي",
  intervals: [3, 3, 4, 4, 2, 4, 4],
  default_root: 4,
  description: "Soft and plaintive, starting on a half-flat second.",
};

const nameAt = (position: number): NoteName => neck.locations[position % 24]?.name ?? FALLBACK;
const FALLBACK: NoteName = { letter: "C", alter: 0, octave: 4 };

/** A small scale: the maqam's steps from the root on course 1; one ascending octave as playback. */
export function scaleFor(maqam: Maqam, root: number): Scale {
  const steps = [0];
  for (const gap of maqam.intervals) steps.push((steps.at(-1) ?? 0) + gap);
  const where = (step: number) => ({ course: 1, position: (root + step) % 24 });
  return {
    maqam,
    root,
    degrees: steps.slice(0, 7).map((step, i) => ({
      degree: i + 1,
      pitch_class: (root + step) % 24,
      letter: nameAt(root + step).letter,
      alter: nameAt(root + step).alter,
    })),
    locations: steps.slice(0, 7).map((step, i) => ({
      ...where(step),
      pitch: 96 + ((root + step) % 24),
      name: nameAt(root + step),
      degree: i + 1,
    })),
    playback: steps.map((step) => ({
      pitch: 96 + root + step,
      name: nameAt(root + step),
      location: where(step),
    })),
  };
}

export const qualities: Quality[] = [
  { id: "major", symbol: "", name: "major", tones: tones([0, "root"], [4, "third"], [7, "fifth"]) },
  {
    id: "m7",
    symbol: "m7",
    name: "minor 7th",
    tones: tones([0, "root"], [3, "third"], [10, "seventh"]),
  },
];

function tones(...rows: [number, string][]): Quality["tones"] {
  return rows.map(([semitones, role]) => ({ semitones, role }));
}

const guitarName = (letter: NoteName["letter"], octave: number): NoteName => ({
  letter,
  alter: 0,
  octave,
});

/** Standard and drop D, string 1 (highest) first, as the API lists them. */
export const guitarTunings: GuitarTuning[] = [
  {
    id: "standard",
    label: "Standard",
    strings: [104, 94, 86, 76, 68, 56].map((pitch, i) => ({
      string: i + 1,
      pitch,
      name: guitarName("E", 4),
    })),
  },
  {
    id: "dropd",
    label: "Drop D",
    strings: [104, 94, 86, 76, 68, 52].map((pitch, i) => ({
      string: i + 1,
      pitch,
      name: guitarName("E", 4),
    })),
  },
];

/** A chord on course 1 only (the test neck has just that course): voicing 1 root+third, voicing 2 root+fifth. */
export function chordFor(root: number, qualityId: string): ChordResult {
  const quality = qualities.find((q) => q.id === qualityId) ?? qualities[0];
  const found = (steps: number, role: string) => {
    const position = (root + steps) % 24;
    return { course: 1, position, pitch: 96 + position, name: nameAt(position), role };
  };
  const [rootTone, thirdTone, fifthTone] = (quality?.tones ?? []).map((t) =>
    found(t.semitones * 2, t.role),
  );
  const all = [rootTone, thirdTone, fifthTone].filter((l) => l !== undefined);
  return {
    chord: {
      root,
      quality_id: qualityId,
      symbol: quality?.symbol ?? "",
      name: { letter: nameAt(root).letter, alter: nameAt(root).alter },
      tones: all.map((l) => ({
        pitch_class: l.position,
        letter: l.name.letter,
        alter: l.name.alter,
        role: l.role,
      })),
    },
    locations: all,
    voicings: [
      { locations: all.slice(0, 2), bass_is_root: true, span: 2, open_courses: 0 },
      {
        locations: [all[0], all[2]].filter((l) => l !== undefined),
        bass_is_root: false,
        span: 3,
        open_courses: 1,
      },
    ],
    arpeggio: [...all, { ...(all[0] ?? found(0, "root")), position: (root + 24) % 24 }].map(
      (l) => ({
        pitch: l.pitch,
        name: l.name,
        location: { course: l.course, position: l.position },
      }),
    ),
  };
}

const C: NoteName = guitarName("C", 4);
const identifyC = (
  letter: "C" | "A",
  symbol: string,
  quality: string,
): Identified["matches"][number] => ({
  root: letter === "C" ? 0 : 18,
  quality_id: quality,
  symbol,
  name: { letter, alter: 0 },
  bass: { letter: "C", alter: 0 },
  missing: symbol === "m7" ? ["fifth"] : [],
});

/** x32010 in standard tuning is C major (and, with a C bass, Am7 without its fifth); any other shape is unknown. */
function identify(init: RequestInit | undefined): Identified {
  const body = JSON.parse(String(init?.body ?? "{}")) as { frets: (number | null)[] };
  const c = JSON.stringify(body.frets) === JSON.stringify([0, 1, 0, 2, 3, null]);
  const notes = body.frets.flatMap((fret, i) =>
    fret === null ? [] : [{ string: i + 1, fret, pitch: 100 - i * 5 + fret * 2, name: C }],
  );
  return { notes, matches: c ? [identifyC("C", "", "major"), identifyC("A", "m7", "m7")] : [] };
}

function respondChords(url: string, init?: RequestInit): unknown {
  if (url === "/api/chords/qualities") return qualities;
  const chord = /^\/api\/chords\/(\d+)\/(\w+)\?/.exec(url);
  if (chord) return chordFor(Number(chord[1]), chord[2] ?? "major");
  if (url === "/api/guitar/tunings") return guitarTunings;
  if (url === "/api/guitar/identify") return identify(init);
  return undefined;
}

/** Text with a tab line (a bar) converts to the fixture; any other text finds no tab. */
function convert(init: RequestInit | undefined) {
  const { text } = JSON.parse(String(init?.body ?? "{}")) as { text: string };
  return text.includes("|") ? CONVERTED : noTab(text);
}

function respond(url: string, init?: RequestInit): unknown {
  if (url === "/api/tab/convert") return convert(init);
  const chords = respondChords(url, init);
  if (chords !== undefined) return chords;
  const scale = /^\/api\/maqamat\/(\w+)\/scale\?root=(\d+)/.exec(url);
  const found = [rast, bayati].find((m) => m.id === scale?.[1]);
  if (scale && found) return scaleFor(found, Number(scale[2]));
  if (url === "/api/maqamat") return [rast, bayati];
  if (url.startsWith("/api/neck")) return neck;
  return [neck.tuning, { id: "ff", label: "F-F" }];
}

/** Stubs fetch like the backend (tunings, neck, maqamat, scales, chords, guitar, tab) and starts with empty storage. */
export function stubApi() {
  localStorage.clear();
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => ({
    ok: true,
    json: async () => respond(url, init),
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
