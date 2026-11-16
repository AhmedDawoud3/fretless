import { expect, test } from "vitest";
import { HOLD_MS, type Hold, holdStep, START_HOLD } from "./hold";

const run = (samples: [Parameters<typeof holdStep>[1], number][], from: Hold = START_HOLD) =>
  samples.reduce((hold, [sample, at]) => holdStep(hold, sample, at), from);

test("starts idle", () => {
  expect(START_HOLD.phase).toBe("idle");
});

test("idle to hearing on a sound that is not in tune, to holding on one that is", () => {
  expect(run([["off", 0]]).phase).toBe("hearing");
  expect(run([["in_tune", 0]]).phase).toBe("holding");
  expect(
    run([
      ["off", 0],
      ["in_tune", 100],
    ]).phase,
  ).toBe("holding");
});

test("a hold of half a second passes; a shorter one does not", () => {
  expect(HOLD_MS).toBe(500);
  expect(
    run([
      ["in_tune", 1000],
      ["in_tune", 1499],
    ]).phase,
  ).toBe("holding");
  expect(
    run([
      ["in_tune", 1000],
      ["in_tune", 1500],
    ]).phase,
  ).toBe("passed");
});

test("the hold is counted from the first in-tune sample, not restarted by the next ones", () => {
  const held = run([
    ["in_tune", 0],
    ["in_tune", 200],
    ["in_tune", 400],
    ["in_tune", 520],
  ]);
  expect(held.phase).toBe("passed");
});

test("drifting out of tune resets the hold and counts a drift", () => {
  const drifted = run([
    ["in_tune", 0],
    ["in_tune", 300],
    ["off", 400],
  ]);
  expect(drifted).toMatchObject({ phase: "hearing", drifts: 1 });
  expect(run([["in_tune", 500]], drifted).phase).toBe("holding");
  expect(
    run(
      [
        ["in_tune", 500],
        ["in_tune", 1000],
      ],
      drifted,
    ).phase,
  ).toBe("passed");
});

test("silence mid-hold resets to idle and counts a drift; silence before a hold costs nothing", () => {
  expect(
    run([
      ["in_tune", 0],
      ["nothing", 100],
    ]),
  ).toMatchObject({ phase: "idle", drifts: 1 });
  expect(
    run([
      ["off", 0],
      ["nothing", 100],
    ]),
  ).toMatchObject({ phase: "idle", drifts: 0 });
});

test("once passed it stays passed", () => {
  const done = run([
    ["in_tune", 0],
    ["in_tune", 600],
  ]);
  expect(
    run(
      [
        ["off", 700],
        ["nothing", 800],
      ],
      done,
    ).phase,
  ).toBe("passed");
});
