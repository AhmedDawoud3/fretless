import { useState } from "react";

export const ZOOM_MIN = 70;
export const ZOOM_MAX = 150;
export const ZOOM_STEP = 10;
export const ZOOM_DEFAULT = 100;

export function clampZoom(pct: number): number {
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round(pct)));
}

/** Shared zoom, auto-follow, and height-expand state for tab viewers. */
export function useTabPanelView() {
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);
  const [follow, setFollow] = useState(true);
  const [expanded, setExpanded] = useState(false);

  return {
    zoom,
    follow,
    expanded,
    zoomOut: () => setZoom((z) => clampZoom(z - ZOOM_STEP)),
    zoomIn: () => setZoom((z) => clampZoom(z + ZOOM_STEP)),
    resetZoom: () => setZoom(ZOOM_DEFAULT),
    toggleFollow: () => setFollow((v) => !v),
    toggleExpanded: () => setExpanded((v) => !v),
  };
}

/** Compact − / % / + zoom button strip. */
export function TabZoomControls({
  scope,
  zoom,
  onOut,
  onReset,
  onIn,
}: {
  scope: string;
  zoom: number;
  onOut: () => void;
  onReset: () => void;
  onIn: () => void;
}) {
  return (
    <fieldset className="tab-zoom-controls" aria-label={`${scope} zoom`}>
      <button
        type="button"
        aria-label={`Zoom out ${scope}`}
        disabled={zoom <= ZOOM_MIN}
        onClick={onOut}
      >
        −
      </button>
      <button
        type="button"
        className="tab-zoom-value"
        aria-label={`Reset ${scope} zoom`}
        disabled={zoom === ZOOM_DEFAULT}
        onClick={onReset}
      >
        {`${zoom}%`}
      </button>
      <button
        type="button"
        aria-label={`Zoom in ${scope}`}
        disabled={zoom >= ZOOM_MAX}
        onClick={onIn}
      >
        +
      </button>
    </fieldset>
  );
}

/** Zoom, Follow-playback, and Expand-height controls shared by visual and ASCII tab panels. */
export function TabPanelActions({
  scope,
  zoom,
  follow,
  expanded,
  onOut,
  onReset,
  onIn,
  onToggleFollow,
  onToggleExpand,
}: {
  scope: string;
  zoom: number;
  follow: boolean;
  expanded: boolean;
  onOut: () => void;
  onReset: () => void;
  onIn: () => void;
  onToggleFollow: () => void;
  onToggleExpand: () => void;
}) {
  return (
    <div className="tab-panel-actions">
      <TabZoomControls scope={scope} zoom={zoom} onOut={onOut} onReset={onReset} onIn={onIn} />
      <button type="button" className="tab-tool-btn" aria-pressed={follow} onClick={onToggleFollow}>
        Follow
      </button>
      <button
        type="button"
        className="tab-tool-btn"
        aria-pressed={expanded}
        onClick={onToggleExpand}
      >
        Expand
      </button>
    </div>
  );
}
