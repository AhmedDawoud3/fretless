import { courseY, positionToX } from "./geometry";
import { NECK_LAYOUT } from "./layout";
import { COMPACT_PILL_HEIGHT, PILL_HEIGHT, pillWidth } from "./pill";

export type Marker = {
  course: number;
  position: number;
  label?: string;
  tone?: "normal" | "root" | "active";
  /** For crowded overlays: the label is drawn on the dot itself, in small type. */
  compact?: boolean;
};

function CompactDot({ marker, x, y }: { marker: Marker; x: number; y: number }) {
  if (!marker.label) return <circle cx={x} cy={y} r={8} />;
  const width = pillWidth(marker.label, true);
  return (
    <>
      <rect
        x={x - width / 2}
        y={y - COMPACT_PILL_HEIGHT / 2}
        width={width}
        height={COMPACT_PILL_HEIGHT}
        rx={COMPACT_PILL_HEIGHT / 2}
      />
      <text x={x} y={y + 4}>
        {marker.label}
      </text>
    </>
  );
}

function MarkerDot({ marker }: { marker: Marker }) {
  const x = positionToX(NECK_LAYOUT, marker.position);
  const y = courseY(NECK_LAYOUT, marker.course);
  const tone = `marker marker-${marker.tone ?? "normal"}`;
  if (marker.compact) {
    return (
      <g className={`${tone} marker-compact`}>
        <CompactDot marker={marker} x={x} y={y} />
      </g>
    );
  }
  const width = marker.label ? pillWidth(marker.label) : 0;
  return (
    <g className={tone}>
      <circle cx={x} cy={y} r={8} />
      {marker.label && (
        <g>
          <rect
            className="marker-pill"
            x={x - width / 2}
            y={y - 36}
            width={width}
            height={PILL_HEIGHT}
            rx={10}
          />
          <text x={x} y={y - 22}>
            {marker.label}
          </text>
        </g>
      )}
    </g>
  );
}

export function MarkerDots({ markers }: { markers: readonly Marker[] }) {
  return (
    <g className="markers">
      {markers.map((m) => (
        <MarkerDot key={`${m.course}-${m.position}`} marker={m} />
      ))}
    </g>
  );
}
