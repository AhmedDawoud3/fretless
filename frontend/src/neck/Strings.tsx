import { courseY } from "./geometry";
import { BRIDGE_X, NECK_LAYOUT, NUT_X } from "./layout";

const COURSE_COUNT = 6;
const PAIR_GAP = 2.6;

type CourseStringsProps = { course: number; vibrationKey: number | null };

/** Courses 1 to 5 are two close parallel strings; the lowest is a single wound string. */
function offsetsFor(course: number): number[] {
  return course === COURSE_COUNT ? [0] : [-PAIR_GAP, PAIR_GAP];
}

/** Lower courses are thicker; the two lowest are wound (bronze). */
function widthFor(course: number): number {
  return 1 + (course - 1) * 0.28;
}

export function CourseStrings({ course, vibrationKey }: CourseStringsProps) {
  const y = courseY(NECK_LAYOUT, course);
  const wound = course >= COURSE_COUNT - 1;
  return (
    <g
      key={vibrationKey ?? "still"}
      className={vibrationKey === null ? "course" : "course vibrating"}
      data-course={course}
    >
      {offsetsFor(course).map((offset) => (
        <line
          key={offset}
          className={wound ? "string string-wound" : "string"}
          x1={NUT_X}
          x2={BRIDGE_X}
          y1={y + offset}
          y2={y + offset}
          strokeWidth={widthFor(course)}
        />
      ))}
    </g>
  );
}
