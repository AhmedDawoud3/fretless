import type { PointerEvent } from "react";
import type { Point } from "./geometry";
import { VIEW_HEIGHT, VIEW_WIDTH } from "./layout";

/** Pointer position in drawing units (the svg keeps its aspect ratio, so scaling is linear). */
export function toDrawingPoint(event: PointerEvent<SVGSVGElement>): Point {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) * VIEW_WIDTH) / rect.width,
    y: ((event.clientY - rect.top) * VIEW_HEIGHT) / rect.height,
  };
}
