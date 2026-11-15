import { describe, expect, it } from "vitest";
import { noteStartTimes } from "./schedule";

describe("noteStartTimes", () => {
  it("spaces notes evenly, starting at 0", () => {
    expect(noteStartTimes(4, 120)).toEqual([0, 0.5, 1, 1.5]);
  });

  it("is slower at a lower tempo", () => {
    expect(noteStartTimes(2, 60)).toEqual([0, 1]);
  });

  it("returns nothing for no notes", () => {
    expect(noteStartTimes(0, 90)).toEqual([]);
  });
});
