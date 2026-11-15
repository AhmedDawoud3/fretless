import { type Layout, positionToX } from "../neck/geometry";
import { SEMITONE } from "./shape";

/**
 * The guitar neck in SVG units: nut on the left, string 1 at the top. It reuses the
 * oud's geometry, since a guitar fret n is position 2n on a fretless string.
 */
export const GUITAR_LAYOUT: Layout = { nutX: 70, length: 1500, topY: 40, courseSpacing: 30 };

export const fretX = (fret: number): number => positionToX(GUITAR_LAYOUT, fret * SEMITONE);

/** Where a finger on `fret` sits: just behind the fret wire, midway between it and the one before. */
export const fretCenterX = (fret: number): number => (fretX(fret - 1) + fretX(fret)) / 2;
