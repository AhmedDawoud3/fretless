import type { NeckOut } from "../api/client";
import { Body } from "./Body";
import { Defs } from "./Defs";
import { Fingerboard } from "./Fingerboard";
import { Guides } from "./Guides";
import { VIEW_HEIGHT, VIEW_WIDTH } from "./layout";
import { type Marker, MarkerDots } from "./MarkerDots";
import { Neck } from "./Neck";
import { Pegbox } from "./Pegbox";
import { CourseStrings } from "./Strings";
import "./neck.css";

export type { Marker };

export type OudNeckProps = {
  neck: NeckOut;
  markers?: readonly Marker[];
  showGuides: boolean;
  snap: boolean;
  onPlay?: (hit: { course: number; position: number; pitch: number }) => void;
  /** Text drawn above the even-position guide marks (e.g. virtual fret numbers). */
  rulerLabel?: (position: number) => string;
};

/** The whole oud, horizontal: pegbox left, course 1 at the top, strings nut to bridge. */
export function OudNeck({ neck, markers = [], showGuides, rulerLabel }: OudNeckProps) {
  return (
    <svg
      className="oud-neck"
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      role="img"
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
      {neck.courses.map((c) => (
        <CourseStrings key={c.course} course={c.course} vibrationKey={null} />
      ))}
      <MarkerDots markers={markers} />
    </svg>
  );
}
