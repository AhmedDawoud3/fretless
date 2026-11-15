import { expect, test } from "vitest";
import type { NeckLocation } from "../api/client";
import { rootOptions } from "./rootOptions";

function location(pitch: number, letter: "C" | "D", alter: number): NeckLocation {
  return { course: 1, position: 0, pitch, name: { letter, alter, octave: 4 } };
}

const locations = [location(96, "C", 0), location(120 + 2, "D", 0), location(97 + 24, "C", 1)];

test("lists all 24 pitch classes, named from the neck by pitch modulo 24", () => {
  const options = rootOptions(locations, "letters");
  expect(options).toHaveLength(24);
  expect(options[0]).toEqual({ value: 0, label: "C" });
  expect(options[2]).toEqual({ value: 2, label: "D" });
  expect(options[1]?.label).toBe("C𝄲");
});

test("names follow the naming system, and a pitch class missing from the neck gets its number", () => {
  expect(rootOptions(locations, "solfege")[2]?.label).toBe("Re");
  expect(rootOptions(locations, "letters")[5]?.label).toBe("5");
});
