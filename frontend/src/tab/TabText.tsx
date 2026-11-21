import { Fragment, type MouseEvent, useEffect, useMemo, useRef } from "react";
import type { ConvertedSystem } from "../api/client";
import { isAsciiTabLine, isQuarterToneCell, tokenizePlainStretch } from "./asciiTokens";
import { type Cell, locateCells, type Piece, splitLine } from "./cells";
import { scrollWithinContainer } from "./scrollContainer";

type TabTextProps = {
  text: string;
  systems: readonly ConvertedSystem[];
  /** The event to mark, by key: its characters are wrapped in <mark>. */
  activeKey: string | null;
  follow?: boolean;
  onPick: (key: string) => void;
};

function PlainPiece({ text, isTab, atStart }: { text: string; isTab: boolean; atStart: boolean }) {
  const tokens = tokenizePlainStretch(text, isTab, atStart);
  return tokens.map((tok, i) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: static token slice within one plain stretch
    <span key={i} className={`ascii-${tok.kind}`}>
      {tok.text}
    </span>
  ));
}

function PieceText({
  piece,
  active,
  isTab,
  atStart,
}: {
  piece: Piece;
  active: boolean;
  isTab: boolean;
  atStart: boolean;
}) {
  if (piece.key === null) return <PlainPiece text={piece.text} isTab={isTab} atStart={atStart} />;
  if (active) return <mark data-event={piece.key}>{piece.text}</mark>;
  const noteClass = isQuarterToneCell(piece.text) ? "ascii-note ascii-note-quarter" : "ascii-note";
  return (
    <span data-event={piece.key} className={noteClass}>
      {piece.text}
    </span>
  );
}

type LineProps = { line: string; number: number; cells: Cell[]; activeKey: string | null };

function Line({ line, number, cells, activeKey }: LineProps) {
  const isTab = isAsciiTabLine(line);
  return splitLine(line, number, cells).map((piece, i) => (
    <PieceText
      // biome-ignore lint/suspicious/noArrayIndexKey: the pieces of one line, never reordered
      key={i}
      piece={piece}
      active={piece.key === activeKey}
      isTab={isTab}
      atStart={i === 0}
    />
  ));
}

const eventKeyOf = (event: MouseEvent) =>
  event.target instanceof Element
    ? event.target.closest("[data-event]")?.getAttribute("data-event")
    : null;

/**
 * The converted tab, never wrapped. Each printed note carries its event so a click picks it,
 * scrolling only its own bounded container instead of the page viewport.
 */
export function TabText({ text, systems, activeKey, follow = true, onPick }: TabTextProps) {
  const preRef = useRef<HTMLPreElement | null>(null);
  const cells = useMemo(() => locateCells(text, systems), [text, systems]);
  const lines = text.split("\n");

  useEffect(() => {
    if (!follow || !activeKey || !preRef.current) return;
    const mark = preRef.current.querySelector<HTMLElement>("mark");
    scrollWithinContainer(preRef.current.parentElement, mark, 24);
  }, [activeKey, follow]);

  const pick = (event: MouseEvent) => {
    const key = eventKeyOf(event);
    if (key) onPick(key);
  };
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: a click on a note is a shortcut; Play and the change list do the same by keyboard
    <pre ref={preRef} onClick={pick}>
      {lines.map((line, number) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: the lines of one text, never reordered
        <Fragment key={number}>
          <Line {...{ line, number, cells, activeKey }} />
          {number < lines.length - 1 ? "\n" : ""}
        </Fragment>
      ))}
    </pre>
  );
}
