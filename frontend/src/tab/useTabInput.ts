import { useEffect, useState } from "react";
import type { TabMode } from "../api/client";
import { loadSettings, saveSettings, TAB_TEXT_MAX } from "../explorer/settings";

/** The pasted text and the output mode, remembered; text too long for the API is not kept. */
export function useTabInput() {
  const [saved] = useState(loadSettings);
  const [text, setText] = useState(saved.tabText);
  const [mode, setMode] = useState<TabMode>(saved.tabMode);
  const tooLong = text.length > TAB_TEXT_MAX;

  useEffect(() => {
    saveSettings({ tabText: tooLong ? "" : text, tabMode: mode });
  }, [text, mode, tooLong]);

  return { text, setText, mode, setMode, tooLong };
}
