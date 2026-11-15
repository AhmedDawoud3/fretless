import { BRIDGE_X, CENTER_Y, JOINT_X, NECK_LAYOUT } from "./layout";
import { Rosette } from "./Rosette";

const y = (offset: number) => CENTER_Y + offset;
const x = (offset: number) => JOINT_X + offset;

/**
 * Pear-shaped outline from the top of the neck round the bowl to the bottom of the
 * neck. It leaves the neck edge flat and eases outward, so the shoulder is one smooth curve.
 */
const BOWL = `M ${x(-30)} ${y(-75)}
  C ${x(60)} ${y(-75)} ${x(110)} ${y(-190)} ${x(350)} ${y(-202)}
  C ${x(600)} ${y(-214)} ${x(920)} ${y(-170)} ${x(930)} ${y(0)}
  C ${x(920)} ${y(170)} ${x(600)} ${y(214)} ${x(350)} ${y(202)}
  C ${x(110)} ${y(190)} ${x(60)} ${y(75)} ${x(-30)} ${y(75)}`;

/** Closed for the soundboard fill; the rim stays open so no rim line crosses the neck. */
const OUTLINE = `${BOWL} Z`;

const BRIDGE_HALF = (5 * NECK_LAYOUT.courseSpacing) / 2 + 14;

/** Soundboard with striped bowl edge, rosettes and bridge. */
export function Body() {
  return (
    <g>
      <path d={BOWL} className="bowl-edge" />
      <path d={BOWL} className="bowl-stripes" />
      <path d={OUTLINE} className="soundboard" fill="url(#oud-soundboard)" />
      <Rosette cx={JOINT_X + 520} cy={CENTER_Y} r={84} />
      <Rosette cx={JOINT_X + 300} cy={CENTER_Y - 118} r={28} />
      <Rosette cx={JOINT_X + 300} cy={CENTER_Y + 118} r={28} />
      <rect
        className="bridge"
        x={BRIDGE_X - 9}
        y={CENTER_Y - BRIDGE_HALF}
        width={18}
        height={BRIDGE_HALF * 2}
        rx={9}
      />
    </g>
  );
}
