import { type PointerEvent, useState } from "react";
import type { NeckOut } from "../api/client";
import { formatNoteName, type NamingSystem } from "../notation/noteName";
import { formatVirtualFret } from "../notation/virtualFret";
import { Body } from "./Body";
import { Defs } from "./Defs";
import { Fingerboard } from "./Fingerboard";
import { Guides } from "./Guides";
import { courseY, hitTest, positionToX } from "./geometry";
import { FINGERBOARD_VIEWBOX, FULL_VIEWBOX, NECK_LAYOUT, NUT_X } from "./layout";
import { type Marker, MarkerDots } from "./MarkerDots";
import { Neck } from "./Neck";
import { Pegbox } from "./Pegbox";
import { type Play, toPlay } from "./play";
import { toDrawingPoint } from "./pointer";
import { CourseStrings } from "./Strings";
import { useVibration } from "./useVibration";
import "./neck.css";

export type { Marker };
export type NeckZoom = "fingerboard" | "full";

export type OudNeckProps = {
  neck: NeckOut;
  markers?: readonly Marker[];
  showGuides: boolean;
  snap: boolean;
  zoom?: NeckZoom;
  system?: NamingSystem;
  onPlay?: (hit: { course: number; position: number; pitch: number }) => void;
  /** Text drawn above the even-position guide marks (e.g. virtual fret numbers). */
  rulerLabel?: (position: number) => string;
};

function openBadgeText(neck: NeckOut, course: number, system: NamingSystem): string {
  const loc = neck.locations.find((l) => l.course === course && l.position === 0);
  if (!loc) return `${course}`;
  return `${course} ${formatNoteName(loc.name, system, true)}`;
}

function OpenBadges({ neck, system }: { neck: NeckOut; system: NamingSystem }) {
  return (
    <g className="course-badges">
      {neck.courses.map((c) => {
        const y = courseY(NECK_LAYOUT, c.course);
        return (
          <text key={c.course} className="course-badge" x={NUT_X - 8} y={y + 4}>
            {openBadgeText(neck, c.course, system)}
          </text>
        );
      })}
    </g>
  );
}

function HoverGhost({ hovered }: { hovered: Play | null }) {
  if (!hovered) return null;
  const x = positionToX(NECK_LAYOUT, hovered.position);
  const y = courseY(NECK_LAYOUT, hovered.course);
  return (
    <g className="marker-hover">
      <circle cx={x} cy={y} r={9} />
      <text x={x} y={y - 14}>
        {formatVirtualFret(hovered.position)}
      </text>
    </g>
  );
}

const viewBoxFor = (zoom: NeckZoom) =>
  zoom === "fingerboard" ? FINGERBOARD_VIEWBOX : FULL_VIEWBOX;
const neckClassFor = (zoom: NeckZoom) =>
  zoom === "fingerboard" ? "oud-neck oud-neck-zoom" : "oud-neck";

/** The oud, horizontal: pegbox left, course 1 at the top, defaults to zoomed fingerboard. */
export function OudNeck({
  neck,
  markers = [],
  showGuides,
  snap,
  zoom = "fingerboard",
  system = "letters",
  onPlay,
  rulerLabel,
}: OudNeckProps) {
  const { vibrating, pluck } = useVibration();
  const [hovered, setHovered] = useState<Play | null>(null);

  const playAt = (event: PointerEvent<SVGSVGElement>) => {
    const hit = hitTest(NECK_LAYOUT, neck.courses, toDrawingPoint(event));
    return hit ? toPlay(neck, hit, snap) : null;
  };

  const press = (event: PointerEvent<SVGSVGElement>) => {
    const play = playAt(event);
    if (!play) return;
    pluck(play.course);
    onPlay?.(play);
  };

  return (
    <svg
      className={neckClassFor(zoom)}
      viewBox={viewBoxFor(zoom)}
      role="img"
      onPointerDown={press}
      onPointerMove={(event) => setHovered(playAt(event))}
      onPointerLeave={() => setHovered(null)}
      aria-labelledby="oud-title oud-desc"
    >
      <title id="oud-title">Oud neck</title>
      <desc id="oud-desc">
        An oud with six courses. The lowest course is at the bottom. Press a string to hear a note.
      </desc>
      <Defs />
      <Pegbox />
      <Neck />
      <Body />
      <Fingerboard />
      {showGuides && <Guides courses={neck.courses} rulerLabel={rulerLabel} />}
      <OpenBadges neck={neck} system={system} />
      {neck.courses.map((c) => (
        <CourseStrings
          key={c.course}
          course={c.course}
          vibrationKey={vibrating?.course === c.course ? vibrating.key : null}
        />
      ))}
      <HoverGhost hovered={hovered} />
      <MarkerDots markers={markers} />
    </svg>
  );
}
