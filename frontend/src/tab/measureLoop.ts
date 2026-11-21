export type MeasureRange = {
  number: number;
  startEvent: number;
  endEvent: number;
};

export type MeasureLoop = {
  startMeasure: number;
  endMeasure: number;
  startEvent: number;
  endEvent: number;
};

/**
 * Songsterr-style A-B measure loop selector:
 * - none -> click bar A selects single-bar loop [A..A]
 * - [A..A] -> click A clears loop; click B selects [min(A,B)..max(A,B)]
 * - [A..B] -> click C restarts single-bar loop [C..C]
 */
export function toggleMeasureLoop(
  current: MeasureLoop | null,
  clicked: MeasureRange,
): MeasureLoop | null {
  if (!current || current.startMeasure !== current.endMeasure) {
    return {
      startMeasure: clicked.number,
      endMeasure: clicked.number,
      startEvent: clicked.startEvent,
      endEvent: clicked.endEvent,
    };
  }
  if (current.startMeasure === clicked.number) return null;
  return {
    startMeasure: Math.min(current.startMeasure, clicked.number),
    endMeasure: Math.max(current.startMeasure, clicked.number),
    startEvent: Math.min(current.startEvent, clicked.startEvent),
    endEvent: Math.max(current.endEvent, clicked.endEvent),
  };
}

export function isMeasureLooped(loop: MeasureLoop | null, measureNumber: number): boolean {
  return loop !== null && measureNumber >= loop.startMeasure && measureNumber <= loop.endMeasure;
}
