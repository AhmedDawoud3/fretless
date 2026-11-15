import { useEffect, useState } from "react";
import { fetchNeck, fetchTunings, type NeckOut, type Tuning } from "../api/client";

export type NeckData =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; tunings: Tuning[]; neck: NeckOut };

function toNeckData(failed: boolean, tunings: Tuning[] | null, neck: NeckOut | null): NeckData {
  if (failed) return { status: "error" };
  if (!tunings || !neck) return { status: "loading" };
  return { status: "ready", tunings, neck };
}

/** Loads the tuning list, then the neck for the chosen tuning (the first one unless a known one is given). */
export function useNeckData(initialTuningId: string | null = null) {
  const [tunings, setTunings] = useState<Tuning[] | null>(null);
  const [tuningId, setTuningId] = useState<string | null>(initialTuningId);
  const [neck, setNeck] = useState<NeckOut | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetchTunings()
      .then((list) => {
        setTunings(list);
        setTuningId((current) =>
          list.some((t) => t.id === current) ? current : (list[0]?.id ?? null),
        );
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    if (!tuningId) return;
    fetchNeck(tuningId)
      .then(setNeck)
      .catch(() => setFailed(true));
  }, [tuningId]);

  const data = toNeckData(failed, tunings, neck);
  return { data, tuningId, setTuningId };
}
