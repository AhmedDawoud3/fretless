import { expect, test } from "vitest";
import { checkEcho, hintFor } from "./check";
import type { EchoQuestion } from "./question";

const question: EchoQuestion = { reference: 86, target: 100 };

test("a note below the target says higher, above says lower, the same says that is it", () => {
  expect(hintFor(question, 90)).toBe("higher");
  expect(hintFor(question, 104)).toBe("lower");
  expect(hintFor(question, 100)).toBe("that's it");
});

test("finding it first time is correct", () => {
  expect(checkEcho(question, { pitch: 100, tries: 1 })).toEqual({
    correct: true,
    found: true,
    tries: 1,
  });
});

test("finding it after misses is found but not a first-try hit", () => {
  expect(checkEcho(question, { pitch: 100, tries: 3 })).toEqual({
    correct: false,
    found: true,
    tries: 3,
  });
});

test("giving up is neither", () => {
  expect(checkEcho(question, { pitch: null, tries: 2 })).toEqual({
    correct: false,
    found: false,
    tries: 2,
  });
});
