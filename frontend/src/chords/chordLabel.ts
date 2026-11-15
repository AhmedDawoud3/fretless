import type { ChordMatch, NoteName } from "../api/client";
import { formatNoteName, type NamingSystem } from "../notation/noteName";

type Spelling = ChordMatch["name"];

export function spellingName(spelling: Spelling, system: NamingSystem): string {
  return formatNoteName({ ...spelling, octave: 0 } satisfies NoteName, system);
}

const sameNote = (a: Spelling, b: Spelling) => a.letter === b.letter && a.alter === b.alter;

/** "C" or "La" with the symbol after it ("Am7"); solfege gets a space so "Lam" does not run together. */
export function chordSymbol(root: Spelling, symbol: string, system: NamingSystem): string {
  const gap = system === "solfege" && symbol ? " " : "";
  return `${spellingName(root, system)}${gap}${symbol}`;
}

/** "C major" for a plain major chord, "Am7" for the rest, "C/E" with a bass, "(no fifth)" if tones are left out. */
export function matchLabel(match: ChordMatch, system: NamingSystem): string {
  const inBass = sameNote(match.bass, match.name);
  const plainMajor = match.symbol === "" && inBass;
  const base = plainMajor
    ? `${spellingName(match.name, system)} major`
    : chordSymbol(match.name, match.symbol, system);
  const bass = inBass ? "" : `/${spellingName(match.bass, system)}`;
  const missing = match.missing.map((role) => `no ${role}`).join(", ");
  return `${base}${bass}${missing ? ` (${missing})` : ""}`;
}

/** "C major": the root with the quality's name. */
export function chordName(root: Spelling, qualityName: string, system: NamingSystem): string {
  return `${spellingName(root, system)} ${qualityName}`;
}
