import { expect, test } from "vitest";
import { isAsciiTabLine, isQuarterToneCell, tokenizePlainStretch } from "./asciiTokens";

test("isAsciiTabLine distinguishes tab rows from titles and empty lines", () => {
  expect(isAsciiTabLine("C |--3--5--|")).toBe(true);
  expect(isAsciiTabLine("Bb|----1.5-|")).toBe(true);
  expect(isAsciiTabLine("Awel Hamsa")).toBe(false);
  expect(isAsciiTabLine("")).toBe(false);
});

test("tokenizePlainStretch classifies labels, bars, rails, and trailing text verbatim", () => {
  const stretch = "Eb|--|---  (x2)";
  const tokens = tokenizePlainStretch(stretch, true, true);
  expect(tokens).toEqual([
    { kind: "label", text: "Eb" },
    { kind: "bar", text: "|" },
    { kind: "rail", text: "--" },
    { kind: "bar", text: "|" },
    { kind: "rail", text: "---" },
    { kind: "text", text: "  (x2)" },
  ]);
  expect(tokens.map((t) => t.text).join("")).toBe(stretch);

  const midLine = "h--|";
  expect(tokenizePlainStretch(midLine, true, false)).toEqual([
    { kind: "text", text: "h" },
    { kind: "rail", text: "--" },
    { kind: "bar", text: "|" },
  ]);

  expect(tokenizePlainStretch("Intro | Verse --", false, true)).toEqual([
    { kind: "text", text: "Intro | Verse --" },
  ]);
});

test("isQuarterToneCell identifies .5 virtual frets and d/+ ASCII quarter-tone spellings", () => {
  expect(isQuarterToneCell("1.5")).toBe(true);
  expect(isQuarterToneCell("1.5(Ed)")).toBe(true);
  expect(isQuarterToneCell("Ed")).toBe(true);
  expect(isQuarterToneCell("F+")).toBe(true);
  expect(isQuarterToneCell("3")).toBe(false);
  expect(isQuarterToneCell("Bb")).toBe(false);
  expect(isQuarterToneCell("F#")).toBe(false);
});
