import { identifyShape } from "../api/client";
import { useRequest } from "../app/useRequest";
import type { Frets } from "./shape";

type Shape = { strings: readonly number[]; capo: number; frets: Frets };

/** The notes a shape sounds and the chords it could be, asked of the API after every change. */
export function useIdentify({ strings, capo, frets }: Shape) {
  const key = JSON.stringify([strings, capo, frets]);
  const { value, failed } = useRequest(key, () =>
    identifyShape({ strings: [...strings], capo, frets: [...frets] }),
  );
  return { identified: value, failed };
}
