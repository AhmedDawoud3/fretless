import { useState } from "react";
import type { NeckOut } from "../api/client";
import type { SharedSettings } from "../app/useSharedSettings";
import { playSteps } from "../audio";
import type { Marker } from "../neck/OudNeck";
import type { Play } from "../neck/play";
import { describePlay, type LabelMode, markerLabel, type Readout } from "./readout";
import { roundTrip } from "./roundTrip";
import { highlightAt, scaleMarkers, withMarker } from "./scaleOverlay";
import { loadSettings } from "./settings";
import { useMaqam } from "./useMaqam";
import { usePlayback } from "./usePlayback";
import { useSaveMaqamSettings } from "./useSaveMaqamSettings";

type Last = { tuningId: string | null; play: Play };

function lastMarker(last: Play | null, readout: Readout | null, mode: LabelMode): Marker | null {
  if (!last || !readout) return null;
  return {
    course: last.course,
    position: last.position,
    label: markerLabel(readout, mode),
    tone: "active",
  };
}

/** Maqam page state: the chosen maqam and its scale, playback, and the last played note. */
export function useExplorer(shared: SharedSettings, neck: NeckOut) {
  const { tuningId, system, labelMode } = shared;
  const [saved] = useState(loadSettings);
  const [lastPlayed, setLastPlayed] = useState<Last | null>(null);
  const maqam = useMaqam({ maqamId: saved.maqamId, root: saved.root }, tuningId);
  const [tempo, setTempo] = useState(saved.tempo);
  useSaveMaqamSettings({ ...maqam.chosen, tempo });
  const playback = usePlayback(`${maqam.maqam?.id}|${maqam.selection?.root}|${tuningId}`);

  const play = (hit: Play) => {
    playSteps(hit.pitch);
    setLastPlayed({ tuningId, play: hit });
  };
  const togglePlayback = () => {
    if (playback.playing) playback.stop();
    else if (maqam.scale) playback.start(roundTrip(maqam.scale.playback), tempo);
  };

  // A note played on another tuning no longer says anything about this one.
  const last = lastPlayed?.tuningId === tuningId ? lastPlayed.play : null;
  const readout = last ? describePlay(neck, last, system) : null;
  const shown = maqam.scale ? scaleMarkers(maqam.scale.locations, labelMode, system) : [];
  const overlay = highlightAt(shown, playback.location);
  const markers = withMarker(overlay, lastMarker(last, readout, labelMode));
  return { play, readout, markers, maqam, playback, togglePlayback, tempo, setTempo };
}
