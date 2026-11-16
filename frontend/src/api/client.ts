import type { components } from "./schema";

export type Tuning = components["schemas"]["TuningOut"];
export type NeckOut = components["schemas"]["NeckOut"];
export type NeckLocation = components["schemas"]["NeckLocationOut"];
export type NoteName = components["schemas"]["NoteNameOut"];
export type Maqam = components["schemas"]["MaqamOut"];
export type Scale = components["schemas"]["ScaleOut"];
export type ScaleLocation = components["schemas"]["ScaleLocationOut"];
export type Quality = components["schemas"]["QualityOut"];
export type ChordResult = components["schemas"]["ChordOut"];
export type RoleLocation = components["schemas"]["RoleLocationOut"];
export type Voicing = components["schemas"]["VoicingOut"];
export type GuitarTuning = components["schemas"]["GuitarTuningOut"];
export type IdentifyBody = components["schemas"]["IdentifyIn"];
export type Identified = components["schemas"]["IdentifyOut"];
export type ChordMatch = components["schemas"]["MatchOut"];
export type ConvertBody = components["schemas"]["ConvertIn"];
export type TabMode = ConvertBody["mode"];
export type Converted = components["schemas"]["ConvertOut"];
export type ConvertedSystem = components["schemas"]["PlacedSystemOut"];
export type ConvertedSummary = components["schemas"]["SummaryOut"];
export type Alteration = components["schemas"]["AlterationOut"];
export type PlaybackEvent = components["schemas"]["PlaybackEventOut"];
export type Interval = components["schemas"]["IntervalOut"];
export type Course = components["schemas"]["CourseOut"];
export type Lesson = components["schemas"]["LessonOut"];
export type LessonStep = components["schemas"]["LessonStepOut"];
export type TranscribeBody = components["schemas"]["TranscribeIn"];

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = init ? await fetch(path, init) : await fetch(path);
  if (!response.ok) {
    throw new Error(`${path} failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

export function fetchTunings(): Promise<Tuning[]> {
  return getJson<Tuning[]>("/api/tunings");
}

export function fetchNeck(tuningId: string): Promise<NeckOut> {
  return getJson<NeckOut>(`/api/neck/${encodeURIComponent(tuningId)}`);
}

export function fetchIntervals(): Promise<Interval[]> {
  return getJson<Interval[]>("/api/intervals");
}

export function fetchCourses(tuningId: string): Promise<Lesson[]> {
  return getJson<Lesson[]>(`/api/courses?tuning=${encodeURIComponent(tuningId)}`);
}

export function fetchMaqamat(): Promise<Maqam[]> {
  return getJson<Maqam[]>("/api/maqamat");
}

export function fetchScale(maqamId: string, root: number, tuningId: string): Promise<Scale> {
  const path = `/api/maqamat/${encodeURIComponent(maqamId)}/scale`;
  return getJson<Scale>(`${path}?root=${root}&tuning=${encodeURIComponent(tuningId)}`);
}

export function fetchQualities(): Promise<Quality[]> {
  return getJson<Quality[]>("/api/chords/qualities");
}

export function fetchChord(root: number, qualityId: string, tuningId: string) {
  const query = new URLSearchParams({ tuning: tuningId });
  return getJson<ChordResult>(`/api/chords/${root}/${encodeURIComponent(qualityId)}?${query}`);
}

export function fetchGuitarTunings(): Promise<GuitarTuning[]> {
  return getJson<GuitarTuning[]>("/api/guitar/tunings");
}

export function identifyShape(body: IdentifyBody): Promise<Identified> {
  return getJson<Identified>("/api/guitar/identify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** The API refuses text or audio it cannot take with 422: that is an answer, not a failure. */
export type ConvertReply = { rejected: false; converted: Converted } | { rejected: true };

async function postConvert<T>(path: string, body: T): Promise<ConvertReply> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (response.status === 422) return { rejected: true };
  if (!response.ok) throw new Error(`${path} failed with status ${response.status}`);
  return { rejected: false, converted: (await response.json()) as Converted };
}

export function convertTab(body: ConvertBody): Promise<ConvertReply> {
  return postConvert("/api/tab/convert", body);
}

export function transcribeAudio(body: TranscribeBody): Promise<ConvertReply> {
  return postConvert("/api/audio/transcribe", body);
}
