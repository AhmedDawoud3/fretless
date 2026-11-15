import { CENTER_Y, NUT_X } from "./layout";

const BOX_END_X = 66;
const HALF_WIDTH_AT_NUT = 70;
const HALF_WIDTH_AT_END = 50;
const CAP_END_X = 44;
const CAP_HALF_WIDTH = 34;
const PEG_SPACING = 26;
/** An 11-string oud has 5 doubled courses and a single bass: 6 pegs on one side, 5 on the other. */
const TOP_PEGS = Array.from({ length: 6 }, (_, i) => 84 + i * PEG_SPACING);
const BOTTOM_PEGS = Array.from({ length: 5 }, (_, i) => 97 + i * PEG_SPACING);

/** Half the box width at x: the box widens steadily from its tip to the nut. */
function halfWidthAt(x: number): number {
  const along = (x - BOX_END_X) / (NUT_X - BOX_END_X);
  return HALF_WIDTH_AT_END + along * (HALF_WIDTH_AT_NUT - HALF_WIDTH_AT_END);
}

function Peg({ x, side }: { x: number; side: 1 | -1 }) {
  const edge = CENTER_Y + side * halfWidthAt(x);
  return (
    <g className={side === -1 ? "peg peg-top" : "peg peg-bottom"}>
      <circle className="peg-hole" cx={x} cy={edge} r={6} />
      <line x1={x} y1={edge} x2={x} y2={edge + side * 14} className="peg-stem" />
      <rect x={x - 5} y={side === 1 ? edge + 12 : edge - 34} width={10} height={22} rx={5} />
    </g>
  );
}

const BOX = `M ${NUT_X} ${CENTER_Y - HALF_WIDTH_AT_NUT} L ${BOX_END_X} ${CENTER_Y - HALF_WIDTH_AT_END}
  L ${BOX_END_X} ${CENTER_Y + HALF_WIDTH_AT_END} L ${NUT_X} ${CENTER_Y + HALF_WIDTH_AT_NUT} Z`;

/** The end of a bent-back pegbox: it narrows and curls over into a rounded tip. */
const CAP = `M ${BOX_END_X} ${CENTER_Y - CAP_HALF_WIDTH - 8}
  Q ${CAP_END_X} ${CENTER_Y - CAP_HALF_WIDTH} ${CAP_END_X} ${CENTER_Y}
  Q ${CAP_END_X} ${CENTER_Y + CAP_HALF_WIDTH} ${BOX_END_X} ${CENTER_Y + CAP_HALF_WIDTH + 8} Z`;

/** Pegbox seen from above: a tapering box, a curled tip, a bend where the neck turns back. */
export function Pegbox() {
  return (
    <g>
      {TOP_PEGS.map((x) => (
        <Peg key={`t${x}`} x={x} side={-1} />
      ))}
      {BOTTOM_PEGS.map((x) => (
        <Peg key={`b${x}`} x={x} side={1} />
      ))}
      <path className="pegbox" d={CAP} />
      <path className="pegbox" d={BOX} />
      <path className="pegbox-shade" d={`M ${BOX_END_X + 10} ${CENTER_Y} H ${NUT_X - 40}`} />
      <path
        className="pegbox-bend"
        d={`M ${NUT_X - 34} ${CENTER_Y - HALF_WIDTH_AT_NUT + 4} Q ${NUT_X - 24} ${CENTER_Y} ${NUT_X - 34} ${CENTER_Y + HALF_WIDTH_AT_NUT - 4}`}
      />
      <rect className="nut" x={NUT_X - 5} y={CENTER_Y - 72} width={7} height={144} rx={2} />
    </g>
  );
}
