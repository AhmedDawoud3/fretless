import { BOARD_BOTTOM, BOARD_TOP, GuitarFrets } from "./GuitarFrets";
import { GuitarStrings } from "./GuitarStrings";
import { fretX, GUITAR_LAYOUT } from "./guitarLayout";
import { FRET_COUNT, type Frets } from "./shape";
import "./guitar.css";

const VIEW_WIDTH = fretX(FRET_COUNT) + 30;
const VIEW_HEIGHT = BOARD_BOTTOM + 34;

type GuitarNeckProps = {
  frets: Frets;
  capo: number;
  onFret: (string: number, fret: number) => void;
  onNut: (string: number) => void;
};

/** A guitar neck, nut on the left and the lowest string at the bottom. Frets count from the capo. */
export function GuitarNeck({ frets, capo, onFret, onNut }: GuitarNeckProps) {
  return (
    <svg
      className="guitar-neck"
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      aria-labelledby="guitar-title"
    >
      <title id="guitar-title">Guitar neck. Click a fret on a string to place a finger.</title>
      <GuitarFrets />
      {capo > 0 && (
        <g className="guitar-capo">
          <rect
            x={GUITAR_LAYOUT.nutX + 4}
            y={BOARD_TOP - 6}
            width={14}
            height={BOARD_BOTTOM - BOARD_TOP + 12}
            rx={5}
          />
          <text x={GUITAR_LAYOUT.nutX + 11} y={BOARD_TOP - 12}>
            capo {capo}
          </text>
        </g>
      )}
      <GuitarStrings frets={frets} onFret={onFret} onNut={onNut} />
    </svg>
  );
}
