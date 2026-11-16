import { useEffect, useState } from "react";
import { fetchIntervals, fetchMaqamat, type NeckOut } from "../api/client";
import type { LabelMode } from "../explorer/readout";
import { loadSettings, type PageId, saveSettings } from "../explorer/settings";
import { useNeckData } from "../explorer/useNeckData";
import type { NamingSystem } from "../notation/noteName";
import { useRequest } from "./useRequest";

/**
 * The settings both pages share, and the oud neck they are drawn on. The one owner
 * of these: pages read them and never keep a copy.
 */
export function useSharedSettings() {
  const [saved] = useState(loadSettings);
  const { data, tuningId, setTuningId } = useNeckData(saved.tuningId);
  const [page, setPage] = useState<PageId>(saved.page);
  const [snap, setSnap] = useState(saved.snap);
  const [guides, setGuides] = useState(saved.guides);
  const [labelMode, setLabelMode] = useState<LabelMode>(saved.labelMode);
  const [system, setSystem] = useState<NamingSystem>(saved.system);
  const { value: intervals, failed: intervalsFailed } = useRequest("intervals", fetchIntervals);
  const { value: maqamat, failed: maqamatFailed } = useRequest("maqamat", fetchMaqamat);

  useEffect(() => {
    // Until the tuning is known there is nothing to save: that would erase the stored one.
    if (tuningId === null) return;
    saveSettings({ page, tuningId, snap, guides, labelMode, system });
  }, [page, tuningId, snap, guides, labelMode, system]);

  return {
    ...{ data, tuningId, setTuningId, page, setPage, snap, setSnap },
    ...{ intervals, intervalsFailed, maqamat, maqamatFailed },
    ...{ guides, setGuides, labelMode, setLabelMode, system, setSystem },
  };
}

export type SharedSettings = ReturnType<typeof useSharedSettings>;
/** What each page gets: the shared settings, with the neck loaded. */
export type PageProps = { shared: SharedSettings; neck: NeckOut };
