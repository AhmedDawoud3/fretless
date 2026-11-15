import { useEffect, useState } from "react";
import { fetchScale, type Scale } from "../api/client";
import type { Selection } from "./maqamChoice";
import { answerFor, type Loaded, scaleRequest } from "./scaleRequest";

/** The scale for the chosen maqam and root on a tuning; null while loading or in free play. */
export function useScale(selection: Selection | null, tuningId: string | null) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    const request = scaleRequest(selection, tuningId);
    if (!request) return;
    let stale = false;
    const done = (scale: Scale | null) => !stale && setLoaded({ key: request.key, scale });
    fetchScale(request.id, request.root, request.tuningId)
      .then(done)
      .catch(() => done(null));
    return () => {
      stale = true;
    };
  }, [selection, tuningId]);

  const answer = answerFor(loaded, scaleRequest(selection, tuningId));
  return { scale: answer?.scale ?? null, failed: answer !== null && answer.scale === null };
}
