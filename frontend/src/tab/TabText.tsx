import { Fragment, type MouseEvent, useMemo } from "react";
import type { ConvertedSystem } from "../api/client";
import { type Cell, locateCells, type Piece, splitLine } from "./cells";

type TabTextProps = {
  text: string;
  systems: readonly ConvertedSystem[];
  /** The event to mark, by key: its characters are wrapped in <mark>. */
  activeKey: string | null;
  onPick: (key: string) => void;
};

const reveal = (el: HTMLElement | null) =>
  el?.scrollIntoView?.({ block: "nearest", inline: "nearest" });

function PieceText({ piece, active }: { piece: Piece; active: boolean }) {
  if (piece.key === null) return piece.text;
  if (!active) return <span data-event={piece.key}>{piece.text}</span>;
  return (
    <mark ref={reveal} data-event={piece.key}>
      {piece.text}
    </mark>
  );
}

type LineProps = { line: string; number: number; cells: Cell[]; activeKey: string | null };

function Line({ line, number, cells, activeKey }: LineProps) {
  return splitLine(line, number, cells).map((piece, i) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: the pieces of one line, never reordered
    <PieceText key={i} piece={piece} active={piece.key === activeKey} />
  ));
}

const eventKeyOf = (event: MouseEvent) =>
  event.target instanceof Element
    ? event.target.closest("[data-event]")?.getAttribute("data-event")
    : null;

/**
 * The converted tab, never wrapped. Each printed note is an element carrying its event, so a
 * click picks it; keyboard users pick events through the list of changes and Play.
 */
export function TabText({ text, systems, activeKey, onPick }: TabTextProps) {
  const cells = useMemo(() => locateCells(text, systems), [text, systems]);
  const lines = text.split("\n");
  const pick = (event: MouseEvent) => {
    const key = eventKeyOf(event);
    if (key) onPick(key);
  };
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: a click on a note is a shortcut; Play and the change list do the same by keyboard
    <pre onClick={pick}>
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
