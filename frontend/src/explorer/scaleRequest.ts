import type { Scale } from "../api/client";
import type { Selection } from "./maqamChoice";

export type ScaleRequest = { id: string; root: number; tuningId: string; key: string };

/** What to ask the backend for, or null in free play or while the tuning is unknown. */
export function scaleRequest(
  selection: Selection | null,
  tuningId: string | null,
): ScaleRequest | null {
  if (!selection || !tuningId) return null;
  const id = selection.maqam.id;
  return { id, root: selection.root, tuningId, key: `${id}|${selection.root}|${tuningId}` };
}

export type Loaded = { key: string; scale: Scale | null };

/** The loaded answer, but only if it is for the request now being asked (not a stale one). */
export function answerFor(loaded: Loaded | null, request: ScaleRequest | null): Loaded | null {
  return loaded && loaded.key === request?.key ? loaded : null;
}
