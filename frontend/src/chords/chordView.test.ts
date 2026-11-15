import { expect, test } from "vitest";
import type { ChordResult, RoleLocation, Voicing } from "../api/client";
import { chordTonesText, describeVoicing, toNeckNotes } from "./chordView";

const at = (
  course: number,
  position: number,
  letter: "C" | "E" | "G",
  role: string,
): RoleLocation => ({
  course,
  position,
  pitch: 90 - course * 5,
  name: { letter, alter: 0, octave: 3 },
  role,
});

test("the root is marked so the neck can draw it apart", () => {
  const notes = toNeckNotes([at(5, 3, "C", "root"), at(4, 2, "E", "third")]);
  expect(notes.map((n) => n.root)).toEqual([true, false]);
  expect(notes[0]).toMatchObject({ course: 5, position: 3, name: { letter: "C" } });
});

const voicing = (over: Partial<Voicing>): Voicing => ({
  locations: [at(5, 3, "C", "root"), at(4, 2, "E", "third"), at(2, 0, "G", "fifth")],
  bass_is_root: true,
  span: 2,
  open_courses: 1,
  ...over,
});

test("a voicing lists its notes with course and virtual fret, and says what is good about it", () => {
  const card = describeVoicing(voicing({}), "letters");
  expect(card.notes).toEqual(["C: course 5, fret 1.5", "E: course 4, fret 1", "G: course 2, open"]);
  expect(card.tags).toEqual(["root in bass", "1 open course"]);
});

test("a voicing with no open courses and the root higher has no tags", () => {
  const card = describeVoicing(voicing({ bass_is_root: false, open_courses: 0 }), "letters");
  expect(card.tags).toEqual([]);
});

test("several open courses are counted in the plural", () => {
  expect(describeVoicing(voicing({ open_courses: 2 }), "letters").tags).toContain("2 open courses");
});

test("the chord's tones are listed with their jobs, in the chosen naming system", () => {
  const tones: ChordResult["chord"]["tones"] = [
    { pitch_class: 0, letter: "C", alter: 0, role: "root" },
    { pitch_class: 8, letter: "E", alter: 0, role: "third" },
    { pitch_class: 14, letter: "G", alter: 0, role: "fifth" },
  ];
  expect(chordTonesText(tones, "letters")).toBe("C root, E third, G fifth");
  expect(chordTonesText(tones, "solfege")).toBe("Do root, Mi third, Sol fifth");
});
