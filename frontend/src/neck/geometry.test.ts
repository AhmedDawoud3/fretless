import { expect, test } from "vitest";
import { courseY, hitTest, type Layout, positionToX, snapPosition, xToPosition } from "./geometry";

const layout: Layout = { nutX: 100, length: 1200, topY: 50, courseSpacing: 30 };
const courses = [
  { course: 1, max_position: 24 },
  { course: 2, max_position: 14 },
  { course: 3, max_position: 14 },
];

test("open string sits at the nut, position 24 at half the string, 14 at one third", () => {
  expect(positionToX(layout, 0)).toBeCloseTo(100);
  expect(positionToX(layout, 24)).toBeCloseTo(100 + 600);
  expect(positionToX(layout, 14)).toBeCloseTo(100 + 1200 * (1 - 2 ** (-14 / 24)));
  expect(positionToX(layout, 14) - 100).toBeCloseTo(400, -1);
});

test("xToPosition inverts positionToX", () => {
  for (let p = 0; p <= 24; p += 0.37) {
    expect(xToPosition(layout, positionToX(layout, p))).toBeCloseTo(p, 9);
  }
});

test("course 1 is at the top, lower courses further down", () => {
  expect(courseY(layout, 1)).toBe(50);
  expect(courseY(layout, 3)).toBe(110);
});

test("a point near a string hits the nearest course with a fractional position", () => {
  const hit = hitTest(layout, courses, { x: positionToX(layout, 7.5), y: courseY(layout, 2) + 4 });
  expect(hit?.course).toBe(2);
  expect(hit?.position).toBeCloseTo(7.5, 9);
});

test("pressing left of the nut on a string plays the open course", () => {
  expect(hitTest(layout, courses, { x: 80, y: courseY(layout, 3) })).toEqual({
    course: 3,
    position: 0,
  });
});

test("outside a string's playable range there is no hit", () => {
  expect(
    hitTest(layout, courses, { x: positionToX(layout, 20), y: courseY(layout, 2) }),
  ).toBeNull();
  expect(
    hitTest(layout, courses, { x: positionToX(layout, 20), y: courseY(layout, 1) })?.course,
  ).toBe(1);
  expect(hitTest(layout, courses, { x: 500, y: 400 })).toBeNull();
  expect(hitTest(layout, courses, { x: 0, y: courseY(layout, 1) })).toBeNull();
});

test("snap rounds to the nearest step and stays inside the course range", () => {
  expect(snapPosition(courses, 2, 7.4)).toBe(7);
  expect(snapPosition(courses, 2, 7.6)).toBe(8);
  expect(snapPosition(courses, 2, 14.4)).toBe(14);
  expect(snapPosition(courses, 2, -0.3)).toBe(0);
});
