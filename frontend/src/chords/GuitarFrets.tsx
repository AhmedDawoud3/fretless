import { courseY } from "../neck/geometry";
import { fretCenterX, fretX, GUITAR_LAYOUT } from "./guitarLayout";
import { FRET_COUNT, STRING_COUNT } from "./shape";

const INLAYS = [3, 5, 7, 9];
const FRETS = Array.from({ length: FRET_COUNT }, (_, i) => i + 1);
const { courseSpacing } = GUITAR_LAYOUT;

export const BOARD_TOP = courseY(GUITAR_LAYOUT, 1) - courseSpacing / 2;
export const BOARD_BOTTOM = courseY(GUITAR_LAYOUT, STRING_COUNT) + courseSpacing / 2;
const MIDDLE = (BOARD_TOP + BOARD_BOTTOM) / 2;

function Inlay({ fret }: { fret: number }) {
  const x = fretCenterX(fret);
  if (fret !== FRET_COUNT) return <circle cx={x} cy={MIDDLE} r={6} />;
  return (
    <>
      <circle cx={x} cy={MIDDLE - courseSpacing} r={6} />
      <circle cx={x} cy={MIDDLE + courseSpacing} r={6} />
    </>
  );
}

/** The wood, the fret wires, the dots at 3 5 7 9 12 and the fret numbers underneath. */
export function GuitarFrets() {
  return (
    <g className="guitar-frets">
      <rect
        className="guitar-board"
        x={fretX(0)}
        y={BOARD_TOP}
        width={fretX(FRET_COUNT) - fretX(0)}
        height={BOARD_BOTTOM - BOARD_TOP}
      />
      <g className="guitar-inlays">
        {[...INLAYS, FRET_COUNT].map((fret) => (
          <Inlay key={fret} fret={fret} />
        ))}
      </g>
      {FRETS.map((fret) => (
        <g key={fret}>
          <line
            className="guitar-wire"
            x1={fretX(fret)}
            x2={fretX(fret)}
            y1={BOARD_TOP}
            y2={BOARD_BOTTOM}
          />
          <text className="guitar-fret-number" x={fretCenterX(fret)} y={BOARD_BOTTOM + 20}>
            {fret}
          </text>
        </g>
      ))}
      <line className="guitar-nut" x1={fretX(0)} x2={fretX(0)} y1={BOARD_TOP} y2={BOARD_BOTTOM} />
    </g>
  );
}
