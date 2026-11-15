import { useEffect } from "react";
import { type Settings, saveSettings } from "./settings";

type MaqamSettings = Pick<Settings, "maqamId" | "root" | "tempo">;

/** The maqam page saves its own choices whenever they change. */
export function useSaveMaqamSettings({ maqamId, root, tempo }: MaqamSettings): void {
  useEffect(() => {
    saveSettings({ maqamId, root, tempo });
  }, [maqamId, root, tempo]);
}
