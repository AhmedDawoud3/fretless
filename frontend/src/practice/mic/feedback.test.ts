import { expect, test } from "vitest";
import { compareToTarget } from "../../listen";
import { tunerWords } from "./feedback";

const words = (steps: number, options: { open?: boolean } = {}) =>
  tunerWords(compareToTarget(steps, 100), options);

test("within 15 cents either way is in tune", () => {
  expect(words(100)).toBe("in tune");
  expect(words(100.2)).toBe("in tune");
  expect(words(99.8)).toBe("in tune");
});

test("a little out (up to 35 cents) is a little flat or a little sharp", () => {
  expect(words(99.5)).toBe("a little flat");
  expect(words(100.6)).toBe("a little sharp");
});

test("a flat note is fixed by moving the finger towards the bridge, a sharp one back towards the nut", () => {
  expect(words(99.2)).toBe("flat — slide up towards the bridge");
  expect(words(100.8)).toBe("sharp — slide back towards the nut");
});

test("on an open course the fix is the peg, there is no finger to slide", () => {
  expect(words(99.2, { open: true })).toBe("flat — tighten the string (peg up)");
  expect(words(100.8, { open: true })).toBe("sharp — loosen the string (peg down)");
  expect(words(99.5, { open: true })).toBe("a little flat");
});

test("an octave away is said, and still gets the cents wording", () => {
  const octaveUp = compareToTarget(100 + 24.1, 100, { octaveTolerant: true });
  expect(tunerWords(octaveUp, { octaves: 1 })).toBe("in tune — an octave higher, that counts");
  const octaveDown = compareToTarget(100 - 24 - 0.5, 100, { octaveTolerant: true });
  expect(tunerWords(octaveDown, { octaves: -1 })).toBe(
    "a little flat — an octave lower, that counts",
  );
  const twoUp = compareToTarget(148, 100, { octaveTolerant: true });
  expect(tunerWords(twoUp, { octaves: 2 })).toBe("in tune — 2 octaves higher, that counts");
});
