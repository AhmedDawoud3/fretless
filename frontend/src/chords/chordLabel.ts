import type { ChordMatch, NoteName } from "../api/client";
import { formatNoteName, type NamingSystem } from "../notation/noteName";

type Spelling = ChordMatch["name"];

export function spellingName(spelling: Spelling, system: NamingSystem): string {
  return formatNoteName({ ...spelling, octave: 0 } satisfies NoteName, system);
}

const sameNote = (a: Spelling, b: Spelling) => a.letter === b.letter && a.alter === b.alter;

/** A root's name with the symbol after it ("Am7"); solfege gets a space so "Lam" does not run together. */
export function withSymbol(rootName: string, symbol: string, system: NamingSystem): string {
  const gap = system === "solfege" && symbol ? " " : "";
  return `${rootName}${gap}${symbol}`;
}

/** "C major" for a plain major chord, "Am7" for the rest, "C/E" with a bass, "(no fifth)" if tones are left out. */
export function matchLabel(match: ChordMatch, system: NamingSystem): string {
  const inBass = sameNote(match.bass, match.name);
  const plainMajor = match.symbol === "" && inBass;
  const base = plainMajor
    ? `${spellingName(match.name, system)} major`
    : withSymbol(spellingName(match.name, system), match.symbol, system);
  const bass = inBass ? "" : `/${spellingName(match.bass, system)}`;
  const missing = match.missing.map((role) => `no ${role}`).join(", ");
  return `${base}${bass}${missing ? ` (${missing})` : ""}`;
}

/** "C major": the root with the quality's name. */
export function chordName(root: Spelling, qualityName: string, system: NamingSystem): string {
  return `${spellingName(root, system)} ${qualityName}`;
}
