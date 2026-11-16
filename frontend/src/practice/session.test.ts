import { expect, test } from "vitest";
import { NEW_SESSION, nextSession } from "./session";

test("a right answer extends the streak and the score", () => {
  expect(nextSession(nextSession(NEW_SESSION, true), true)).toEqual({
    streak: 2,
    correct: 2,
    attempts: 2,
  });
});

test("a wrong answer ends the streak but the score stays", () => {
  const s = nextSession(nextSession(NEW_SESSION, true), false);
  expect(s).toEqual({ streak: 0, correct: 1, attempts: 2 });
});
