import { useEffect, useState } from "react";
import { fetchMaqamat, fetchScale, type Maqam, type Scale } from "../api/client";

export type MaqamChoice = { maqamId: string | null; root: number | null };

type Loaded = { request: string; scale: Scale | null };

/**
 * The chosen maqam and root, and the scale the backend computes for them on the
 * current tuning. A null root means "the maqam's traditional root".
 */
export function useMaqam(initial: MaqamChoice, tuningId: string | null) {
  const [maqamat, setMaqamat] = useState<Maqam[]>([]);
  const [maqamId, setMaqamId] = useState(initial.maqamId);
  const [rootChoice, setRootChoice] = useState(initial.root);
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    fetchMaqamat()
      .then(setMaqamat)
      .catch(() => setMaqamat([]));
  }, []);

  const maqam = maqamat.find((m) => m.id === maqamId) ?? null;
  const id = maqam?.id ?? null;
  const root = rootChoice ?? maqam?.default_root ?? null;
  const request = id !== null && root !== null && tuningId ? `${id}|${root}|${tuningId}` : null;

  useEffect(() => {
    if (id === null || root === null || !tuningId || request === null) return;
    let stale = false;
    const done = (scale: Scale | null) => !stale && setLoaded({ request, scale });
    fetchScale(id, root, tuningId)
      .then(done)
      .catch(() => done(null));
    return () => {
      stale = true;
    };
  }, [id, root, tuningId, request]);

  const current = loaded && loaded.request === request ? loaded : null;
  return {
    maqamat,
    maqam,
    root,
    scale: current?.scale ?? null,
    scaleFailed: current !== null && current.scale === null,
    chosen: { maqamId, root: rootChoice },
    choose: (next: string | null) => {
      setMaqamId(next);
      setRootChoice(null);
    },
    chooseRoot: setRootChoice,
  };
}

export type MaqamState = ReturnType<typeof useMaqam>;
