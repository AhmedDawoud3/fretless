/** Where the strings sit in SVG units. Strings run horizontally from the nut to the bridge. */
export type Layout = {
  nutX: number;
  /** Nut-to-bridge string length. */
  length: number;
  /** y of course 1 (the highest, drawn at the top). */
  topY: number;
  courseSpacing: number;
};

export type Point = { x: number; y: number };
export type Hit = { course: number; position: number };
type CourseRange = { course: number; max_position: number };

/** Pressing this far left of the nut still counts as the open string. */
const OPEN_ZONE = 40;
const STEPS_PER_OCTAVE = 24;

/** Stop distance from the nut on a real string: halving the length raises the pitch an octave. */
export function positionToX(layout: Layout, position: number): number {
  return layout.nutX + layout.length * (1 - 2 ** (-position / STEPS_PER_OCTAVE));
}

export function xToPosition(layout: Layout, x: number): number {
  return -STEPS_PER_OCTAVE * Math.log2(1 - (x - layout.nutX) / layout.length);
}

export function courseY(layout: Layout, course: number): number {
  return layout.topY + (course - 1) * layout.courseSpacing;
}

function nearestCourse(layout: Layout, courses: readonly CourseRange[], y: number) {
  let best: CourseRange | undefined;
  for (const candidate of courses) {
    const gap = Math.abs(y - courseY(layout, candidate.course));
    if (
      gap <= layout.courseSpacing / 2 &&
      (!best || gap < Math.abs(y - courseY(layout, best.course)))
    ) {
      best = candidate;
    }
  }
  return best;
}

/** The course and (fractional) position under a pointer, or null off the playable strings. */
export function hitTest(layout: Layout, courses: readonly CourseRange[], point: Point): Hit | null {
  const range = nearestCourse(layout, courses, point.y);
  if (!range || point.x < layout.nutX - OPEN_ZONE || point.x >= layout.nutX + layout.length) {
    return null;
  }
  const position = Math.max(0, xToPosition(layout, point.x));
  return position > range.max_position ? null : { course: range.course, position };
}

export function snapPosition(
  courses: readonly CourseRange[],
  course: number,
  position: number,
): number {
  const max = courses.find((c) => c.course === course)?.max_position ?? 0;
  return Math.min(max, Math.max(0, Math.round(position)));
}
