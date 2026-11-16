import type { ConvertedSystem } from "../api/client";

/** One printed note in the converted text: where it sits, and which event it belongs to. */
export type Cell = { key: string; line: number; start: number; length: number };

/** Event key of a column: its system and its source character index, as the API names them. */
export const cellKey = (system: number, column: number): string => `${system}:${column}`;

const CELL_TEXT = /[^-|]+/g;

/** The runs of cell text in one rendered line, after its label and first bar. */
function runsIn(line: string): { start: number; length: number }[] {
  const from = line.indexOf("|") + 1;
  return [...line.slice(from).matchAll(CELL_TEXT)].map((m) => ({
    start: from + m.index,
    length: m[0].length,
  }));
}

function matchesSystem(lines: readonly string[], first: number, system: ConvertedSystem): boolean {
  const pad = Math.max(...system.labels.map((l) => l.length));
  return system.labels.every((label, i) => {
    const line = lines[first + i];
    return line?.startsWith(`${label.padEnd(pad)}|`) === true && line.endsWith("|");
  });
}

/**
 * The i-th cell on a course line belongs to the i-th column that has a note on that
 * course: conversion may have widened the text, but never reorders it. Any line where
 * the counts differ means the text is not what the columns describe, so none are used.
 */
function cellsOf(lines: readonly string[], first: number, system: ConvertedSystem): Cell[] | null {
  const columns = [...system.columns].sort((a, b) => a.index - b.index);
  const cells: Cell[] = [];
  for (const [i] of system.labels.entries()) {
    const owners = columns.filter((c) => c.notes.some((n) => n.course === i + 1));
    const runs = runsIn(lines[first + i] ?? "");
    if (runs.length !== owners.length) return null;
    for (const [k, column] of owners.entries()) {
      const run = runs[k] ?? { start: 0, length: 0 };
      cells.push({ key: cellKey(system.index, column.index), line: first + i, ...run });
    }
  }
  return cells;
}

/** Every cell of every system that can be found in `text`, systems matched in order. */
export function locateCells(text: string, systems: readonly ConvertedSystem[]): Cell[] {
  const lines = text.split("\n");
  const cells: Cell[] = [];
  let next = 0;
  for (let i = 0; i < lines.length && next < systems.length; ) {
    const system = systems[next];
    if (system && matchesSystem(lines, i, system)) {
      cells.push(...(cellsOf(lines, i, system) ?? []));
      i += system.labels.length;
      next += 1;
    } else {
      i += 1;
    }
  }
  return cells;
}
