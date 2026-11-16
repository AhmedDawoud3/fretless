import { expect, test } from "vitest";
import { EMPTY_PROGRESS, parseProgress, recordAnswer, summarise } from "./progress";

test("nothing stored means no progress", () => {
  expect(parseProgress(undefined)).toEqual(EMPTY_PROGRESS);
});

test("the first answer starts the drill's and the item's tally", () => {
  const p = recordAnswer(EMPTY_PROGRESS, "find", "4", true, 1);
  expect(p).toEqual({
    find: { attempts: 1, correct: 1, bestStreak: 1, items: { "4": { attempts: 1, correct: 1 } } },
  });
});

test("a wrong answer counts as an attempt only, and never lowers the best streak", () => {
  let p = recordAnswer(EMPTY_PROGRESS, "find", "4", true, 3);
  p = recordAnswer(p, "find", "4", false, 0);
  p = recordAnswer(p, "find", "9", true, 1);
  expect(p.find).toEqual({
    attempts: 3,
    correct: 2,
    bestStreak: 3,
    items: { "4": { attempts: 2, correct: 1 }, "9": { attempts: 1, correct: 1 } },
  });
});

test("drills keep separate tallies, and recording does not change the old value", () => {
  const before = recordAnswer(EMPTY_PROGRESS, "find", "4", true, 1);
  const after = recordAnswer(before, "echo", "4", false, 0);
  expect(Object.keys(after).sort()).toEqual(["echo", "find"]);
  expect(before.echo).toBeUndefined();
  expect(before.find?.attempts).toBe(1);
});

test("progress written by the app is read back unchanged", () => {
  let p = recordAnswer(EMPTY_PROGRESS, "find", "4", true, 1);
  p = recordAnswer(p, "interval", "octave", false, 0);
  expect(parseProgress(JSON.parse(JSON.stringify(p)))).toEqual(p);
});

test.each([null, 5, "x", [], { find: 3 }, { find: null }])(
  "garbled progress %j is empty",
  (raw) => {
    expect(parseProgress(raw)).toEqual(EMPTY_PROGRESS);
  },
);

test("each bad drill or item is dropped on its own, good ones are kept", () => {
  const good = {
    attempts: 2,
    correct: 1,
    bestStreak: 1,
    items: { a: { attempts: 2, correct: 1 } },
  };
  const raw = {
    find: good,
    echo: { ...good, correct: 3 },
    interval: { ...good, bestStreak: -1 },
    mixed: {
      ...good,
      items: { ok: { attempts: 1, correct: 1 }, bad: { attempts: 1.5, correct: 0 }, worse: "x" },
    },
  };
  expect(parseProgress(raw)).toEqual({
    find: good,
    mixed: { ...good, items: { ok: { attempts: 1, correct: 1 } } },
  });
});

test("a summary gives tries, whole-number accuracy and best streak, or none before any tries", () => {
  expect(summarise(undefined)).toBeNull();
  const p = recordAnswer(recordAnswer(EMPTY_PROGRESS, "f", "a", true, 1), "f", "a", false, 0);
  expect(summarise(p.f)).toEqual({ attempts: 2, percent: 50, bestStreak: 1 });
});
