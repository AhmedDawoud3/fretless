import { vi } from "vitest";
import type { Maqam, NeckLocation, NeckOut, NoteName, Scale } from "./api/client";

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

function respond(url: string): unknown {
  const scale = /^\/api\/maqamat\/(\w+)\/scale\?root=(\d+)/.exec(url);
  const found = [rast, bayati].find((m) => m.id === scale?.[1]);
  if (scale && found) return scaleFor(found, Number(scale[2]));
  if (url === "/api/maqamat") return [rast, bayati];
  if (url.startsWith("/api/neck")) return neck;
  return [neck.tuning, { id: "ff", label: "F-F" }];
}

/** Stubs fetch like the backend: tunings, neck, maqamat, and scales. Returns the mock. */
export function stubApi() {
  const fetchMock = vi.fn(async (url: string) => ({ ok: true, json: async () => respond(url) }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
