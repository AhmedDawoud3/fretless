import { fetchChord } from "../api/client";
import { useRequest } from "../app/useRequest";

export type ChordChoice = { root: number; qualityId: string };

/** The chord for a root and quality, with its voicings on the chosen oud tuning. */
export function useChord({ root, qualityId }: ChordChoice, tuningId: string) {
  const key = `${root}|${qualityId}|${tuningId}`;
  const { value, failed } = useRequest(key, () => fetchChord(root, qualityId, tuningId));
  return { chord: value, failed, key };
}
