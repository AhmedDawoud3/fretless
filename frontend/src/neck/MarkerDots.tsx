import { courseY, positionToX } from "./geometry";
import { NECK_LAYOUT } from "./layout";

export type Marker = {
  course: number;
  position: number;
  label?: string;
  tone?: "normal" | "root" | "active";
};

const PILL_HEIGHT = 20;
const PILL_CHAR_WIDTH = 9;

function MarkerDot({ marker }: { marker: Marker }) {
  const x = positionToX(NECK_LAYOUT, marker.position);
  const y = courseY(NECK_LAYOUT, marker.course);
  const width = (marker.label?.length ?? 0) * PILL_CHAR_WIDTH + 12;
  return (
    <g className={`marker marker-${marker.tone ?? "normal"}`}>
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
