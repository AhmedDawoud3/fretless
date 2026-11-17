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
export type DetectedMaqam = components["schemas"]["DetectedMaqamOut"];
export type AudioArrangement = components["schemas"]["AudioArrangementOut"];
export type Interval = components["schemas"]["IntervalOut"];
export type Course = components["schemas"]["CourseOut"];
export type Lesson = components["schemas"]["LessonOut"];
export type LessonStep = components["schemas"]["LessonStepOut"];
export type TranscribeBody = components["schemas"]["TranscribeIn"];
export type ImportUrlBody = components["schemas"]["ImportUrlIn"];
export type ImportKind = ImportUrlBody["kind"];
export type ImportPdfBody = components["schemas"]["ImportPdfIn"];
export type ImportedTab = components["schemas"]["ImportTabOut"];
export type ImportedTrack = components["schemas"]["ImportedTrackOut"];
export type TransposeBody = components["schemas"]["TransposeIn"];

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

async function postJson<T, R>(
  path: string,
  body: T,
  on422: (response: Response) => Promise<R>,
  onOk: (payload: unknown) => R,
): Promise<R> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (response.status === 422) return on422(response);
  if (!response.ok) throw new Error(`${path} failed with status ${response.status}`);
  return onOk(await response.json());
}

/** The API refuses text or audio it cannot take with 422: that is an answer, not a failure. */
export type ConvertReply = { rejected: false; converted: Converted } | { rejected: true };

function postConvert<T>(path: string, body: T): Promise<ConvertReply> {
  return postJson<T, ConvertReply>(
    path,
    body,
    async () => ({ rejected: true }),
    (data) => ({ rejected: false, converted: data as Converted }),
  );
}

export function convertTab(body: ConvertBody): Promise<ConvertReply> {
  return postConvert("/api/tab/convert", body);
}

export function transposeTab(body: TransposeBody): Promise<ConvertReply> {
  return postConvert("/api/tab/transpose", body);
}

export function transcribeAudio(body: TranscribeBody): Promise<ConvertReply> {
  return postConvert("/api/audio/transcribe", body);
}

/** Result of importing a tab or chords from Ultimate Guitar, Songsterr, or PDF. */
export type ImportReply =
  | { rejected: false; imported: ImportedTab }
  | { rejected: true; detail: string };

async function readErrorDetail(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    return typeof body.detail === "string" ? body.detail : "Could not import that source.";
  } catch {
    return "Could not import that source.";
  }
}

function postImport<T>(path: string, body: T): Promise<ImportReply> {
  return postJson<T, ImportReply>(
    path,
    body,
    async (res) => ({ rejected: true, detail: await readErrorDetail(res) }),
    (data) => ({ rejected: false, imported: data as ImportedTab }),
  );
}

export function importTabUrl(body: ImportUrlBody): Promise<ImportReply> {
  return postImport("/api/tab/import-url", body);
}

export function importTabPdf(body: ImportPdfBody): Promise<ImportReply> {
  return postImport("/api/tab/import-pdf", body);
}
