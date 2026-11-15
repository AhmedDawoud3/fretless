import { expect, test } from "vitest";
import type { ChordMatch } from "../api/client";
import { chordName, matchLabel, spellingName } from "./chordLabel";

const A = { letter: "A", alter: 0 } as const;
const match = (over: Partial<ChordMatch>): ChordMatch => ({
  root: 0,
  quality_id: "major",
  symbol: "",
  name: { letter: "C", alter: 0 },
  bass: { letter: "C", alter: 0 },
  missing: [],
  ...over,
});

test("a spelling is named without an octave, in the chosen system", () => {
  expect(spellingName({ letter: "E", alter: -2 }, "letters")).toBe("E♭");
  expect(spellingName({ letter: "E", alter: -2 }, "solfege")).toBe("Mi♭");
});

test("a major chord is spelled out, the others use their symbol", () => {
  expect(matchLabel(match({}), "letters")).toBe("C major");
  expect(matchLabel(match({ name: A, bass: A, symbol: "m7" }), "letters")).toBe("Am7");
});

test("a chord missing tones says which", () => {
  const label = matchLabel(match({ symbol: "7", missing: ["fifth"] }), "letters");
  expect(label).toBe("C7 (no fifth)");
  expect(matchLabel(match({ missing: ["fifth", "ninth"] }), "letters")).toBe(
    "C major (no fifth, no ninth)",
  );
});

test("a bass that is not the root is shown after a slash", () => {
  const label = matchLabel(match({ bass: { letter: "E", alter: 0 } }), "letters");
  expect(label).toBe("C/E");
});

test("solfege names get a space before the symbol so it stays readable", () => {
  expect(matchLabel(match({ name: A, bass: A, symbol: "m" }), "solfege")).toBe("La m");
});

test("the chord's own name pairs the root with its quality name", () => {
  expect(chordName({ letter: "A", alter: 0 }, "minor", "letters")).toBe("A minor");
});
