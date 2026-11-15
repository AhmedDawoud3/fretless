import { useEffect, useMemo, useState } from "react";
import { fetchMaqamat, type Maqam } from "../api/client";
import { resolveChoice } from "./maqamChoice";
import { useScale } from "./useScale";

export type MaqamChoice = { maqamId: string | null; root: number | null };

/**
 * The chosen maqam and root, and the scale the backend computes for them on the
 * current tuning. A null root means "the maqam's traditional root".
 */
export function useMaqam(initial: MaqamChoice, tuningId: string | null) {
  const [maqamat, setMaqamat] = useState<Maqam[]>([]);
  const [maqamId, setMaqamId] = useState(initial.maqamId);
  const [rootChoice, setRootChoice] = useState(initial.root);

  useEffect(() => {
    fetchMaqamat()
      .then(setMaqamat)
      .catch(() => setMaqamat([]));
  }, []);

  const selection = useMemo(
    () => resolveChoice(maqamat, maqamId, rootChoice),
    [maqamat, maqamId, rootChoice],
  );
  const { scale, failed } = useScale(selection, tuningId);
  return {
    ...{ maqamat, maqam: selection?.maqam ?? null, selection, scale, scaleFailed: failed },
    chosen: { maqamId, root: rootChoice },
    choose: (next: string | null) => {
      setMaqamId(next);
      setRootChoice(null);
    },
    chooseRoot: setRootChoice,
  };
}

export type MaqamState = ReturnType<typeof useMaqam>;
