import type { components } from "./schema";

export type Tuning = components["schemas"]["TuningOut"];
export type NeckOut = components["schemas"]["NeckOut"];
export type NeckLocation = components["schemas"]["NeckLocationOut"];
export type NoteName = components["schemas"]["NoteNameOut"];
export type Maqam = components["schemas"]["MaqamOut"];
export type Scale = components["schemas"]["ScaleOut"];
export type ScaleLocation = components["schemas"]["ScaleLocationOut"];
export type Course = components["schemas"]["CourseOut"];

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
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

export function fetchMaqamat(): Promise<Maqam[]> {
  return getJson<Maqam[]>("/api/maqamat");
}

export function fetchScale(maqamId: string, root: number, tuningId: string): Promise<Scale> {
  const query = `root=${root}&tuning=${encodeURIComponent(tuningId)}`;
  return getJson<Scale>(`/api/maqamat/${encodeURIComponent(maqamId)}/scale?${query}`);
}
