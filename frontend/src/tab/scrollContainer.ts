export type ScrollRect = {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
};

export type ScrollBox = {
  scrollTop: number;
  scrollLeft: number;
  clientWidth: number;
  clientHeight: number;
  getBoundingClientRect: () => ScrollRect;
};

export type ScrollTarget = {
  getBoundingClientRect: () => ScrollRect;
};

function axisDelta(
  tStart: number,
  tEnd: number,
  cStart: number,
  viewSize: number,
  pad: number,
): number {
  const safePad = Math.min(pad, Math.floor(viewSize / 3));
  const relStart = tStart - cStart;
  const relEnd = tEnd - cStart;
  if (relStart < safePad) return relStart - safePad;
  if (relEnd > viewSize - safePad) return relEnd - (viewSize - safePad);
  return 0;
}

/**
 * Scroll `target` into view inside `container` by mutating only `container.scrollTop` and
 * `container.scrollLeft` — never calling `scrollIntoView` and never shifting the window viewport.
 */
export function scrollWithinContainer(
  container: ScrollBox | null,
  target: ScrollTarget | null,
  pad = 28,
): void {
  if (!container || !target) return;
  const cRect = container.getBoundingClientRect();
  if (cRect.width === 0 || cRect.height === 0) return;
  const tRect = target.getBoundingClientRect();
  const dy = axisDelta(tRect.top, tRect.bottom, cRect.top, container.clientHeight, pad);
  const dx = axisDelta(tRect.left, tRect.right, cRect.left, container.clientWidth, pad);
  if (dy !== 0) container.scrollTop += dy;
  if (dx !== 0) container.scrollLeft += dx;
}
