import type { Course } from "../api/client";
import { courseY, positionToX } from "./geometry";
import { NECK_LAYOUT } from "./layout";
import { pillWidth } from "./pill";

const TICK_REACH = NECK_LAYOUT.courseSpacing * 0.45;

/** Fret number on its own dark pill, so it reads on wood, rim or soundboard alike. */
function RulerLabel({ x, y, text }: { x: number; y: number; text: string }) {
  const width = pillWidth(text, true);
  return (
    <g className="ruler">
      <rect x={x - width / 2} y={y - 9} width={width} height={18} rx={9} />
      <text x={x} y={y + 4}>
        {text}
      </text>
    </g>
  );
}

type GuidesProps = { courses: readonly Course[]; rulerLabel?: (position: number) => string };

function reachingCourses(courses: readonly Course[], position: number) {
  return courses.filter((c) => c.max_position >= position).map((c) => c.course);
}

/** Faint marks at every whole step; stronger at even steps (guitar frets). */
export function Guides({ courses, rulerLabel }: GuidesProps) {
  const top = Math.min(...courses.map((c) => c.course));
  const furthest = Math.max(...courses.map((c) => c.max_position));
  const positions = Array.from({ length: furthest }, (_, i) => i + 1);
  return (
    <g className="guides">
      {positions.map((p) => {
        const reaching = reachingCourses(courses, p);
        const x = positionToX(NECK_LAYOUT, p);
        const even = p % 2 === 0;
        return (
          <g key={p}>
            <line
              className={even ? "guide guide-fret" : "guide"}
              x1={x}
              x2={x}
              y1={courseY(NECK_LAYOUT, top) - TICK_REACH}
              y2={courseY(NECK_LAYOUT, Math.max(...reaching)) + TICK_REACH}
            />
            {even && rulerLabel && (
              <RulerLabel
                x={x}
                y={courseY(NECK_LAYOUT, top) - TICK_REACH - 14}
                text={rulerLabel(p)}
              />
            )}
          </g>
        );
      })}
    </g>
  );
}
