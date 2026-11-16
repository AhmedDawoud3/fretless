import { fireEvent, screen } from "@testing-library/react";
import { courseY, positionToX } from "../neck/geometry";
import { NECK_LAYOUT, VIEW_HEIGHT, VIEW_WIDTH } from "../neck/layout";

/** Presses the oud neck on screen at a course and position, as a finger would. */
export function pressNeck(course: number, position: number): void {
  const svg = screen.getByRole("img", { name: /oud/i });
  svg.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: VIEW_WIDTH, height: VIEW_HEIGHT }) as DOMRect;
  fireEvent.pointerDown(svg, {
    clientX: positionToX(NECK_LAYOUT, position),
    clientY: courseY(NECK_LAYOUT, course),
  });
}
