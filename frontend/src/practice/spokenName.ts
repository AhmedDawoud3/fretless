import type { NoteName } from "../api/client";
import { formatNoteName, type NamingSystem } from "../notation/noteName";

const ALTER_WORDS: Readonly<Record<number, string>> = {
  [-2]: " flat",
  [-1]: " half-flat",
  1: " half-sharp",
  2: " sharp",
};

/** A note in words for a prompt ("E half-flat"), which reads better than the small accidental signs. */
export function spokenName(name: NoteName, system: NamingSystem): string {
  return formatNoteName({ ...name, alter: 0 }, system) + (ALTER_WORDS[name.alter] ?? "");
}
