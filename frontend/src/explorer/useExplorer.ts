import { useState } from "react";
import type { NeckOut, Scale } from "../api/client";
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

/** A note played on another tuning no longer says anything about this one. */
const playedOn = (last: Last | null, tuningId: string | null) =>
  last?.tuningId === tuningId ? last.play : null;

/** The scale's markers with the one sounding highlighted, and the last played note on top. */
function neckMarkers(
  shared: SharedSettings,
  scale: Scale | null,
  location: { course: number; position: number } | null,
  last: Marker | null,
) {
  const shown = scale ? scaleMarkers(scale.locations, shared.labelMode, shared.system) : [];
  return withMarker(highlightAt(shown, location), last);
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

  const last = playedOn(lastPlayed, tuningId);
  const readout = last ? describePlay(neck, last, system) : null;
  const marker = lastMarker(last, readout, labelMode);
  const markers = neckMarkers(shared, maqam.scale, playback.location, marker);
  return { play, readout, markers, maqam, playback, togglePlayback, tempo, setTempo };
}
