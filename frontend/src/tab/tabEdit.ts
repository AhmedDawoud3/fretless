import type { ConvertedSystem, PlaybackEvent, TabMode } from "../api/client";
import { formatVirtualFret } from "../notation/virtualFret";

const GAP_TICKS = 8;

const BLANK_STAFF = ["e|---|", "B|---|", "G|---|", "D|---|", "A|---|", "E|---|"];
const TAB_LINE = /^[^|]*\|.*\|$/;

type SplitLine = { prefix: string; content: string };

function findStaffStart(lines: readonly string[]): number {
  for (let i = 0; i <= lines.length - 6; i += 1) {
    if (lines.slice(i, i + 6).every((l) => TAB_LINE.test(l.trimEnd()))) return i;
  }
  return -1;
}

function splitStaffLine(line: string): SplitLine {
  const trimmed = line.trimEnd();
  const first = trimmed.indexOf("|") + 1;
  const last = trimmed.lastIndexOf("|");
  return { prefix: trimmed.slice(0, first), content: trimmed.slice(first, last) };
}

function appendColumn(parts: SplitLine[], row: number, token: string): string[] {
  const pad = `-${token}--`;
  return parts.map((p, i) => `${p.prefix}${p.content}${i === row ? pad : "-".repeat(pad.length)}|`);
}

function spliceToken(text: string, at: number, remove: number, insert: string): string {
  return text.slice(0, at) + insert + text.slice(at + remove);
}

function writeAtColumn(parts: SplitLine[], row: number, col: number, token: string): string[] {
  const target = parts[row];
  if (!target) return parts.map((p) => `${p.prefix}${p.content}|`);
  const existing = /^\d+(?:\.5)?[hp/\\b~]?/.exec(target.content.slice(col))?.[0] ?? "";
  if (existing.replace(/[hp/\\b~]$/, "") === token) {
    const cleared = spliceToken(target.content, col, existing.length, "-".repeat(existing.length));
    return parts.map((p, i) => `${p.prefix}${i === row ? cleared : p.content}|`);
  }
  const replaceLen = Math.max(1, existing.length);
  const paddedToken = token.padEnd(replaceLen, "-");
  const delta = Math.max(0, paddedToken.length - replaceLen);
  const pad = "-".repeat(delta);
  return parts.map((p, i) => {
    const next =
      i === row
        ? spliceToken(p.content, col, replaceLen, paddedToken)
        : spliceToken(p.content, col + replaceLen, 0, pad);
    return `${p.prefix}${next}|`;
  });
}

/** Toggle or write a guitar fret on `line` (1..6) at `columnIndex`, or append a new column. */
export function toggleGuitarNote(
  text: string,
  line: number,
  columnIndex: number | null,
  fret: number,
): string {
  const lines = text.trim() === "" ? [...BLANK_STAFF] : text.split("\n");
  const start = findStaffStart(lines);
  if (start === -1)
    return toggleGuitarNote([...lines, "", ...BLANK_STAFF].join("\n"), line, columnIndex, fret);
  const parts = lines.slice(start, start + 6).map(splitStaffLine);
  const maxWidth = Math.max(
    columnIndex !== null ? columnIndex + 3 : 0,
    ...parts.map((p) => p.content.length),
  );
  const padded = parts.map((p) => ({ ...p, content: p.content.padEnd(maxWidth, "-") }));
  const token = String(fret);
  const updated =
    columnIndex === null
      ? appendColumn(padded, line - 1, token)
      : writeAtColumn(padded, line - 1, columnIndex, token);
  return [...lines.slice(0, start), ...updated, ...lines.slice(start + 6)].join("\n");
}

export type OudNoteInput = {
  course: number;
  position: number;
  pitch: number;
  name: string;
};

function mergeColumnNotes(
  notes: ConvertedSystem["columns"][number]["notes"],
  incoming: OudNoteInput,
) {
  const existing = notes.find((n) => n.course === incoming.course);
  const next =
    existing && existing.position === incoming.position
      ? notes.filter((n) => n.course !== incoming.course)
      : [...notes.filter((n) => n.course !== incoming.course), incoming];
  return next.sort((a, b) => a.course - b.course);
}

/** Add or toggle a note on an Oud `ConvertedSystem` column, or append a new column when `columnIndex` is null. */
export function placeOudNote(
  system: ConvertedSystem,
  columnIndex: number | null,
  note: OudNoteInput,
): ConvertedSystem {
  const cols = system.columns;
  if (columnIndex === null) {
    const nextIdx = (cols.at(-1)?.index ?? -1) + 3;
    const width = Math.max(system.width, nextIdx + 4);
    return { ...system, width, columns: [...cols, { index: nextIdx, notes: [note] }] };
  }
  const updated = cols
    .map((c) => (c.index === columnIndex ? { ...c, notes: mergeColumnNotes(c.notes, note) } : c))
    .filter((c) => c.notes.length > 0);
  return { ...system, columns: updated };
}

/** Format one note cell in `frets`, `names`, or `both` mode for display and ASCII export. */
export function oudCellText(note: { position: number; name: string }, mode: TabMode): string {
  const fret = formatVirtualFret(note.position);
  if (mode === "names") return note.name;
  if (mode === "both") return `${fret}(${note.name})`;
  return fret;
}

function renderOudCell(
  system: ConvertedSystem,
  colIndex: number,
  note: { position: number; name: string },
  course: number,
  mode: TabMode,
): string {
  const tech = mode === "frets" ? (system.techniques?.[`${course}:${colIndex}`] ?? "") : "";
  return `${oudCellText(note, mode)}${tech}`;
}

/** Render an Oud `ConvertedSystem` back to aligned ASCII tab lines. */
export function renderOudSystemText(system: ConvertedSystem, mode: TabMode): string {
  const labelWidth = Math.max(1, ...system.labels.map((l) => l.length));
  const sorted = [...system.columns].sort((a, b) => a.index - b.index);
  const widths = sorted.map((c) =>
    Math.max(1, ...c.notes.map((n) => renderOudCell(system, c.index, n, n.course, mode).length)),
  );
  const rows = system.labels.map((label, idx) => {
    const course = idx + 1;
    let body = "--";
    sorted.forEach((col, ci) => {
      const cell = col.notes.find((n) => n.course === course);
      const text = cell ? renderOudCell(system, col.index, cell, course, mode) : "";
      body += text.padEnd((widths[ci] ?? 1) + 2, "-");
    });
    return `${label.padEnd(labelWidth)}|${body}|`;
  });
  return rows.join("\n");
}

/** Build playback events with running ticks directly from edited `ConvertedSystem`s. */
export function systemsToPlayback(systems: readonly ConvertedSystem[]): PlaybackEvent[] {
  const events: PlaybackEvent[] = [];
  let offset = 0;
  for (const system of systems) {
    for (const col of system.columns) {
      events.push({
        system: system.index,
        column: col.index,
        tick: offset + col.index,
        notes: col.notes.map((n) => ({ pitch: n.pitch, course: n.course, position: n.position })),
      });
    }
    offset += system.width + GAP_TICKS;
  }
  return events;
}
