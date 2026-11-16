import type { Alteration, ConvertedSystem } from "../api/client";

type Kind = Alteration["kind"];
export type AlterationGroup = { kind: Kind; title: string; items: Alteration[] };

const TITLES: [Kind, string][] = [
  ["transposed", "Whole piece moved"],
  ["octave_shifted", "Notes moved an octave"],
  ["chord_reduced", "Chords simplified"],
  ["unsupported_system", "Systems left as they were"],
];

/** The alterations of each kind, in a fixed order, leaving out kinds that did not happen. */
export function groupAlterations(alterations: readonly Alteration[]): AlterationGroup[] {
  return TITLES.map(([kind, title]) => ({
    kind,
    title,
    items: alterations.filter((a) => a.kind === kind),
  })).filter((group) => group.items.length > 0);
}

/** Where an alteration happened: system and column counted from 1, columns in the order they sound. */
export function locationText(alteration: Alteration, systems: readonly ConvertedSystem[]): string {
  const { system, column } = alteration;
  if (system === null) return "whole piece";
  const where = `system ${system + 1}`;
  const ordinal = systems
    .find((s) => s.index === system)
    ?.columns.findIndex((c) => c.index === column);
  return ordinal === undefined || ordinal < 0 ? where : `${where}, column ${ordinal + 1}`;
}
