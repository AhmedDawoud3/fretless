import { type Layout, positionToX } from "./geometry";

/** SVG units. The nut-to-bridge length is chosen so the neck joint (position 14) lands at 1/3. */
export const NECK_LAYOUT: Layout = { nutX: 230, length: 1200, topY: 175, courseSpacing: 26 };

export const VIEW_WIDTH = 1620;
export const VIEW_HEIGHT = 480;
export const FULL_VIEWBOX = `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`;
/** Zoomed onto the nut, open-course badges, and positions 0..24 without the full bowl. */
export const FINGERBOARD_VIEWBOX = "170 125 710 215";
export const CENTER_Y = NECK_LAYOUT.topY + 2.5 * NECK_LAYOUT.courseSpacing;

export const NUT_X = NECK_LAYOUT.nutX;
export const BRIDGE_X = NECK_LAYOUT.nutX + NECK_LAYOUT.length;
/** Where the neck meets the body: one third of the string, which is position 14. */
export const JOINT_X = positionToX(NECK_LAYOUT, 14);
/** Course 1 plays on up to the halfway point (position 24). */
export const HALF_X = positionToX(NECK_LAYOUT, 24);
