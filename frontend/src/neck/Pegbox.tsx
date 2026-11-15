import { CENTER_Y, NUT_X } from "./layout";

const PEG_XS = [92, 122, 152, 182, 212];

function Peg({ x, side }: { x: number; side: 1 | -1 }) {
  const edge = CENTER_Y + side * 62;
  return (
    <g className="peg">
      <line x1={x} y1={edge} x2={x} y2={edge + side * 16} className="peg-stem" />
      <rect x={x - 5} y={side === 1 ? edge + 14 : edge - 34} width={10} height={20} rx={5} />
    </g>
  );
}

/** Bent-back pegbox seen from the front: tapers away from the nut, pegs on both sides. */
export function Pegbox() {
  const top = CENTER_Y - 60;
  const bottom = CENTER_Y + 60;
  return (
    <g>
      {PEG_XS.map((x) => (
        <Peg key={`t${x}`} x={x} side={-1} />
      ))}
      {PEG_XS.slice(0, 5).map((x) => (
        <Peg key={`b${x}`} x={x} side={1} />
      ))}
      <path
        className="pegbox"
        d={`M ${NUT_X} ${top - 8} L 130 ${top} Q 60 ${top + 4} 54 ${CENTER_Y - 18}
            L 54 ${CENTER_Y + 18} Q 60 ${bottom - 4} 130 ${bottom} L ${NUT_X} ${bottom + 8} Z`}
      />
      <path className="pegbox-shade" d={`M 70 ${CENTER_Y} H ${NUT_X - 20}`} />
      <rect className="nut" x={NUT_X - 5} y={CENTER_Y - 72} width={7} height={144} rx={2} />
    </g>
  );
}
