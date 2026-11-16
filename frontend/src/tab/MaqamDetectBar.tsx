import { useState } from "react";
import type { DetectedMaqam, NeckOut } from "../api/client";
import type { SharedSettings } from "../app/useSharedSettings";
import { labelledMarkers } from "../explorer/labelledMarkers";
import { withMarker } from "../explorer/scaleOverlay";
import type { Marker } from "../neck/MarkerDots";
import { STEPS_PER_OCTAVE } from "../tab/schedule";

/** Build oud-neck markers highlighting every fretboard location in `maqam`. */
export function soloScaleMarkers(
  neck: NeckOut,
  maqam: DetectedMaqam | null,
  shared: Pick<SharedSettings, "labelMode" | "system">,
): Marker[] {
  if (!maqam) return [];
  const scalePcs = new Set(maqam.scale_pitches.map((p) => p % STEPS_PER_OCTAVE));
  const matching = neck.locations.filter((loc) => scalePcs.has(loc.pitch % STEPS_PER_OCTAVE));
  return labelledMarkers(
    matching.map((loc) => ({
      course: loc.course,
      position: loc.position,
      name: loc.name,
      root: loc.pitch % STEPS_PER_OCTAVE === maqam.root,
    })),
    shared.labelMode,
    shared.system,
  );
}

/** Combine optional Solo/Taqsim scale overlay with currently sounding event markers. */
export function resolveNeckMarkers(
  isGuitar: boolean,
  soloMaqam: DetectedMaqam | null,
  neck: NeckOut,
  shared: Pick<SharedSettings, "labelMode" | "system">,
  activeMarkers: readonly Marker[],
): readonly Marker[] {
  if (isGuitar) return [];
  if (!soloMaqam) return activeMarkers;
  const base = soloScaleMarkers(neck, soloMaqam, shared);
  return activeMarkers.reduce((acc, m) => withMarker(acc, m), base);
}

export function useMaqamSolo(candidates: readonly DetectedMaqam[]) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [soloMode, setSoloMode] = useState(false);
  const active = candidates[selectedIdx] ?? candidates[0] ?? null;
  return { active, selectedIdx, setSelectedIdx, soloMode, setSoloMode };
}

type MaqamDetectBarProps = {
  hidden?: boolean;
  candidates: readonly DetectedMaqam[];
  selectedIdx: number;
  soloMode: boolean;
  onSelect: (idx: number) => void;
  onToggleSolo: () => void;
  onExplore: () => void;
};

/** Shows detected Maqam + Root matches and toggles the Solo / Improvise neck scale guide. */
export function MaqamDetectBar({
  hidden = false,
  candidates,
  selectedIdx,
  soloMode,
  onSelect,
  onToggleSolo,
  onExplore,
}: MaqamDetectBarProps) {
  if (hidden || candidates.length === 0) return null;
  const active = candidates[selectedIdx] ?? candidates[0];
  if (!active) return null;

  return (
    <section className="maqam-detect-bar" aria-label="Detected maqam">
      <div className="maqam-detect-info">
        <span className="maqam-detect-title">
          Detected Maqam:{" "}
          <strong>
            {active.maqam_name} ({active.arabic_name}) on {active.root_name}
          </strong>{" "}
          · {active.confidence}% match
        </span>
        {candidates.length > 1 && (
          <fieldset className="maqam-detect-alts" aria-label="Maqam candidates">
            {candidates.map((cand, idx) => (
              <button
                key={`${cand.maqam_id}-${cand.root}`}
                type="button"
                className="maqam-alt-pill"
                aria-pressed={idx === selectedIdx}
                onClick={() => onSelect(idx)}
              >
                {cand.maqam_name} on {cand.root_name} ({cand.confidence}%)
              </button>
            ))}
          </fieldset>
        )}
      </div>
      <div className="maqam-detect-actions">
        <button type="button" aria-pressed={soloMode} onClick={onToggleSolo}>
          Solo / Improvise guide
        </button>
        <button type="button" onClick={onExplore}>
          Open in Maqam Explorer
        </button>
      </div>
    </section>
  );
}
