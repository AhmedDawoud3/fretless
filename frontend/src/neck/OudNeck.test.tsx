import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import type { NeckOut } from "../api/client";
import { courseY, positionToX } from "./geometry";
import { NECK_LAYOUT, VIEW_HEIGHT, VIEW_WIDTH } from "./layout";
import { OudNeck } from "./OudNeck";

afterEach(cleanup);

const neck: NeckOut = {
  tuning: { id: "cc", label: "C-C" },
  courses: [
    { course: 1, open_pitch: 100, max_position: 24 },
    { course: 2, open_pitch: 80, max_position: 14 },
  ],
  locations: [],
};

function pressAt(position: number, course: number) {
  const svg = screen.getByRole("img", { name: /oud/i });
  svg.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: VIEW_WIDTH, height: VIEW_HEIGHT }) as DOMRect;
  fireEvent.pointerDown(svg, {
    clientX: positionToX(NECK_LAYOUT, position),
    clientY: courseY(NECK_LAYOUT, course),
  });
}

test("pressing a string reports the snapped course, position and pitch", () => {
  const onPlay = vi.fn();
  render(<OudNeck neck={neck} showGuides snap onPlay={onPlay} />);
  pressAt(6.7, 2);
  expect(onPlay).toHaveBeenCalledWith({ course: 2, position: 7, pitch: 87 });
});

test("with snap off the position stays fractional", () => {
  const onPlay = vi.fn();
  render(<OudNeck neck={neck} showGuides snap={false} onPlay={onPlay} />);
  pressAt(6.7, 1);
  expect(onPlay.mock.calls[0]?.[0].position).toBeCloseTo(6.7, 6);
});

test("pressing past a course's range plays nothing", () => {
  const onPlay = vi.fn();
  render(<OudNeck neck={neck} showGuides snap onPlay={onPlay} />);
  pressAt(20, 2);
  expect(onPlay).not.toHaveBeenCalled();
});

test("the pegbox has a peg for each of the 11 strings: six on one side, five on the other", () => {
  const { container } = render(<OudNeck neck={neck} showGuides snap />);
  const pegs = [...container.querySelectorAll(".peg")];
  expect(pegs).toHaveLength(11);
  expect(container.querySelectorAll(".peg-top")).toHaveLength(6);
  expect(container.querySelectorAll(".peg-bottom")).toHaveLength(5);
});
