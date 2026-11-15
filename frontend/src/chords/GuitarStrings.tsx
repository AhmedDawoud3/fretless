import type { KeyboardEvent } from "react";
import { courseY } from "../neck/geometry";
import { fretCenterX, fretX, GUITAR_LAYOUT } from "./guitarLayout";
import { FRET_COUNT, type Frets, STRING_COUNT } from "./shape";

const STRINGS = Array.from({ length: STRING_COUNT }, (_, i) => i + 1);
const FRETS = Array.from({ length: FRET_COUNT }, (_, i) => i + 1);
const { courseSpacing, nutX } = GUITAR_LAYOUT;

/** Enter and Space press an SVG button, as they do an HTML one. */
const onKey = (act: () => void) => (event: KeyboardEvent) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  act();
};

type StringsProps = {
  frets: Frets;
  onFret: (string: number, fret: number) => void;
  onNut: (string: number) => void;
};

function stateWord(fret: number | null | undefined): string {
  if (fret === null) return "muted";
  return fret === 0 ? "open" : `fret ${fret}`;
}

function NutControl({
  string,
  fret,
  onNut,
}: {
  string: number;
  fret: Frets[number];
  onNut: () => void;
}) {
  const y = courseY(GUITAR_LAYOUT, string);
  return (
    // biome-ignore lint/a11y/useSemanticElements: an SVG shape cannot be a <button>
    <g
      role="button"
      tabIndex={0}
      className="guitar-nut-control"
      aria-label={`String ${string} nut: ${stateWord(fret)}`}
      onClick={onNut}
      onKeyDown={onKey(onNut)}
    >
      <rect x={0} y={y - courseSpacing / 2} width={nutX - 6} height={courseSpacing} />
      <text x={(nutX - 6) / 2} y={y + 6}>
        {fret === null ? "×" : fret === 0 ? "○" : ""}
      </text>
    </g>
  );
}

/** Strings, the clickable fret cells, the fingers, and the open / muted control at the nut. */
export function GuitarStrings({ frets, onFret, onNut }: StringsProps) {
  return (
    <g className="guitar-strings">
      {STRINGS.map((string) => {
        const y = courseY(GUITAR_LAYOUT, string);
        const fret = frets[string - 1];
        return (
          <g key={string}>
            <line
              className="guitar-string"
              x1={nutX}
              x2={fretX(FRET_COUNT)}
              y1={y}
              y2={y}
              strokeWidth={1.5 + string * 0.6}
            />
            {FRETS.map((f) => (
              // biome-ignore lint/a11y/useSemanticElements: an SVG shape cannot be a <button>
              <rect
                key={f}
                role="button"
                tabIndex={0}
                className="guitar-cell"
                aria-label={`String ${string}, fret ${f}`}
                aria-pressed={fret === f}
                x={fretX(f - 1)}
                y={y - courseSpacing / 2}
                width={fretX(f) - fretX(f - 1)}
                height={courseSpacing}
                onClick={() => onFret(string, f)}
                onKeyDown={onKey(() => onFret(string, f))}
              />
            ))}
            {fret ? (
              <circle className="guitar-finger" cx={fretCenterX(fret)} cy={y} r={11} />
            ) : null}
            <NutControl string={string} fret={fret} onNut={() => onNut(string)} />
          </g>
        );
      })}
    </g>
  );
}
