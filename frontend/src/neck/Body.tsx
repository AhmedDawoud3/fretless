import { BRIDGE_X, CENTER_Y, JOINT_X, NECK_LAYOUT } from "./layout";
import { Rosette } from "./Rosette";

/** Pear-shaped outline, narrow at the neck joint, mirrored about the string centre line. */
const HALF_OUTLINE = (side: 1 | -1) => {
  const y = (offset: number) => CENTER_Y + side * offset;
  return `C ${JOINT_X + 90} ${y(90)} ${JOINT_X + 170} ${y(190)} ${JOINT_X + 350} ${y(202)}
          C ${JOINT_X + 600} ${y(214)} ${JOINT_X + 920} ${y(170)} ${JOINT_X + 930} ${y(0)}`;
};

const OUTLINE = `M ${JOINT_X - 20} ${CENTER_Y - 78} ${HALF_OUTLINE(-1)}
  C ${JOINT_X + 920} ${CENTER_Y + 170} ${JOINT_X + 600} ${CENTER_Y + 214} ${JOINT_X + 350} ${CENTER_Y + 202}
  C ${JOINT_X + 170} ${CENTER_Y + 190} ${JOINT_X + 90} ${CENTER_Y + 90} ${JOINT_X - 20} ${CENTER_Y + 78} Z`;

const BRIDGE_HALF = (5 * NECK_LAYOUT.courseSpacing) / 2 + 14;

/** Soundboard with striped bowl edge, rosettes and bridge. */
export function Body() {
  return (
    <g>
      <path d={OUTLINE} className="bowl-edge" />
      <path d={OUTLINE} className="bowl-stripes" />
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
