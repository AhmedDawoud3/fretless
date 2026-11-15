import type { NoteName } from "../api/client";

export type NamingSystem = "letters" | "solfege";

const SOLFEGE: Record<NoteName["letter"], string> = {
  C: "Do",
  D: "Re",
  E: "Mi",
  F: "Fa",
  G: "Sol",
  A: "La",
  B: "Si",
};

/** Steps from the natural letter to the symbol drawn after it. One place for all accidentals. */
export const ALTER_SYMBOLS: Readonly<Record<number, string>> = {
  [-4]: "𝄫",
  [-3]: "♭𝄳",
  [-2]: "♭",
  [-1]: "𝄳",
  0: "",
  1: "𝄲",
  2: "♯",
  3: "♯𝄲",
  4: "𝄪",
};

export function formatNoteName(name: NoteName, system: NamingSystem, withOctave = false): string {
  const base = system === "solfege" ? SOLFEGE[name.letter] : name.letter;
  const alter = ALTER_SYMBOLS[name.alter] ?? "";
  return `${base}${alter}${withOctave ? name.octave : ""}`;
}
