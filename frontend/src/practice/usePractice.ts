import { useCallback, useEffect, useState } from "react";
import { loadSettings, saveSettings } from "../explorer/settings";
import type { RecordAnswer } from "./drill";
import { EMPTY_PROGRESS, recordAnswer } from "./progress";

/** What the user has done in the drills and the difficulty chosen for each, kept between visits. */
export function usePractice() {
  const [saved] = useState(loadSettings);
  const [progress, setProgress] = useState(saved.progress);
  const [levels, setLevels] = useState(saved.drillLevels);

  useEffect(() => {
    saveSettings({ progress, drillLevels: levels });
  }, [progress, levels]);

  const record: RecordAnswer = useCallback((drillId, itemKey, correct, streak) => {
    setProgress((old) => recordAnswer(old, drillId, itemKey, correct, streak));
  }, []);
  const reset = useCallback(() => setProgress(EMPTY_PROGRESS), []);
  const setLevel = useCallback(
    (drillId: string, level: number) => setLevels((old) => ({ ...old, [drillId]: level })),
    [],
  );
  return { progress, levels, record, reset, setLevel };
}
