import { useEffect } from "react";
import { type Settings, saveSettings } from "./settings";

/** Saves whenever a setting changes, but not before the tuning is known (that would erase it). */
export function useSaveSettings(settings: Settings): void {
  const { tuningId, snap, guides, labelMode, system, maqamId, root, tempo } = settings;
  useEffect(() => {
    if (tuningId === null) return;
    saveSettings({ tuningId, snap, guides, labelMode, system, maqamId, root, tempo });
  }, [tuningId, snap, guides, labelMode, system, maqamId, root, tempo]);
}
