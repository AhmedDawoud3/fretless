import { useState } from "react";
import { playSteps } from "../audio";
import type { Marker } from "../neck/OudNeck";
import type { Play } from "../neck/play";
import type { NamingSystem } from "../notation/noteName";
import { describePlay, type LabelMode, markerLabel, type Readout } from "./readout";
import { highlightAt, scaleMarkers, withMarker } from "./scaleOverlay";
import { loadSettings } from "./settings";
import { useMaqam } from "./useMaqam";
import { type NeckData, useNeckData } from "./useNeckData";
import { usePlayback } from "./usePlayback";
import { useSaveSettings } from "./useSaveSettings";

function describeLast(data: NeckData, last: Play | null, system: NamingSystem): Readout | null {
  return data.status === "ready" && last ? describePlay(data.neck, last, system) : null;
}

function lastMarker(last: Play | null, readout: Readout | null, mode: LabelMode): Marker | null {
  if (!last || !readout) return null;
  return {
    course: last.course,
    position: last.position,
    label: markerLabel(readout, mode),
    tone: "active",
  };
}

/** All explorer page state: loaded data, display options, and the last played note. */
export function useExplorer() {
  const [saved] = useState(loadSettings);
  const { data, tuningId, setTuningId } = useNeckData(saved.tuningId);
  const [snap, setSnap] = useState(saved.snap);
  const [guides, setGuides] = useState(saved.guides);
  const [labelMode, setLabelMode] = useState<LabelMode>(saved.labelMode);
  const [system, setSystem] = useState<NamingSystem>(saved.system);
  const [last, setLast] = useState<Play | null>(null);
  const maqam = useMaqam({ maqamId: saved.maqamId, root: saved.root }, tuningId);
  const [tempo, setTempo] = useState(saved.tempo);
  useSaveSettings({
    ...{ tuningId, snap, guides, labelMode, system, tempo },
    ...maqam.chosen,
  });
  const playback = usePlayback(
    maqam.scale,
    tempo,
    `${maqam.maqam?.id}|${maqam.selection?.root}|${tuningId}`,
  );

  const changeTuning = (id: string) => {
    setLast(null);
    setTuningId(id);
  };
  const play = (hit: Play) => {
    playSteps(hit.pitch);
    setLast(hit);
  };

  const readout = describeLast(data, last, system);
  const shown = maqam.scale ? scaleMarkers(maqam.scale.locations, labelMode, system) : [];
  const overlay = highlightAt(shown, playback.location);
  const markers = withMarker(overlay, lastMarker(last, readout, labelMode));
  return {
    ...{ data, tuningId, changeTuning, snap, setSnap, guides, setGuides },
    ...{
      labelMode,
      setLabelMode,
      system,
      setSystem,
      play,
      readout,
      markers,
      maqam,
      playback,
      tempo,
      setTempo,
    },
  };
}
