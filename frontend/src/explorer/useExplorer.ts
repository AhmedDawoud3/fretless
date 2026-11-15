import { useState } from "react";
import { playSteps } from "../audio";
import type { Marker } from "../neck/OudNeck";
import type { Play } from "../neck/play";
import type { NamingSystem } from "../notation/noteName";
import { describePlay, type LabelMode, markerLabel, type Readout } from "./readout";
import { useMaqam } from "./useMaqam";
import { type NeckData, useNeckData } from "./useNeckData";

function describeLast(data: NeckData, last: Play | null, system: NamingSystem): Readout | null {
  return data.status === "ready" && last ? describePlay(data.neck, last, system) : null;
}

function markersFor(last: Play | null, readout: Readout | null, mode: LabelMode): Marker[] {
  if (!last || !readout) return [];
  return [
    {
      course: last.course,
      position: last.position,
      label: markerLabel(readout, mode),
      tone: "active",
    },
  ];
}

/** All explorer page state: loaded data, display options, and the last played note. */
export function useExplorer() {
  const { data, tuningId, setTuningId } = useNeckData();
  const [snap, setSnap] = useState(true);
  const [guides, setGuides] = useState(true);
  const [labelMode, setLabelMode] = useState<LabelMode>("both");
  const [system, setSystem] = useState<NamingSystem>("letters");
  const [last, setLast] = useState<Play | null>(null);
  const maqam = useMaqam({ maqamId: null, root: null }, tuningId);

  const changeTuning = (id: string) => {
    setLast(null);
    setTuningId(id);
  };
  const play = (hit: Play) => {
    playSteps(hit.pitch);
    setLast(hit);
  };

  const readout = describeLast(data, last, system);
  const markers = markersFor(last, readout, labelMode);
  return {
    ...{ data, tuningId, changeTuning, snap, setSnap, guides, setGuides },
    ...{ labelMode, setLabelMode, system, setSystem, play, readout, markers, maqam },
  };
}
