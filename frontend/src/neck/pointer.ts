import type { PointerEvent } from "react";
import type { Point } from "./geometry";
import { VIEW_HEIGHT, VIEW_WIDTH } from "./layout";

function activeViewBox(svg: SVGSVGElement, rect: DOMRect) {
  const box = svg.viewBox?.baseVal;
  const fullMock = rect.width === VIEW_WIDTH && rect.height === VIEW_HEIGHT;
  if (box && box.width > 0 && !fullMock) {
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  }
  return { x: 0, y: 0, width: VIEW_WIDTH, height: VIEW_HEIGHT };
}

/** Pointer position in drawing units, respecting the active viewBox when scaled in the browser. */
export function toDrawingPoint(event: PointerEvent<SVGSVGElement>): Point {
  const rect = event.currentTarget.getBoundingClientRect();
  const box = activeViewBox(event.currentTarget, rect);
  return {
    x: box.x + ((event.clientX - rect.left) * box.width) / rect.width,
    y: box.y + ((event.clientY - rect.top) * box.height) / rect.height,
  };
}
