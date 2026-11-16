import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { INTERVALS, neck } from "../testApi";
import { DrillShell } from "./DrillShell";
import type { Drill, DrillContext, DrillResult, DrillViewProps } from "./drill";
import { seeded } from "./testRandom";

afterEach(cleanup);

/** A drill with one question: "Pick the bigger number" between 1 and 2. */
type Q = { bigger: number };
type R = DrillResult & { picked: number };

function View({ question, result, onAnswer }: DrillViewProps<Q, number, R>) {
  return (
    <div>
      <p>Pick the bigger number ({question.bigger === 2 ? "two" : "one"} is hidden)</p>
      <button type="button" disabled={result !== null} onClick={() => onAnswer(1)}>
        One
      </button>
      <button type="button" disabled={result !== null} onClick={() => onAnswer(2)}>
        Two
      </button>
    </div>
  );
}

const drill: Drill<Q, number, R> = {
  id: "bigger",
  title: "Bigger",
  blurb: "Pick the bigger number.",
  levels: [{ level: 1, label: "Easy" }],
  makeQuestion: () => ({ bigger: 2 }),
  itemKey: (q) => String(q.bigger),
  check: (q, answer) => ({ correct: answer === q.bigger, picked: answer }),
  describe: (q) => `The bigger number is ${q.bigger}.`,
  View,
};

const context: DrillContext = {
  neck,
  intervals: INTERVALS,
  system: "letters",
  guides: true,
  level: 1,
  stats: {},
};

function shown(onRecord = vi.fn()) {
  render(<DrillShell drill={drill} context={context} onRecord={onRecord} random={seeded(1)} />);
  return onRecord;
}

test("shows the drill's question and starts with no streak and no score", () => {
  shown();
  expect(screen.getByText(/Pick the bigger number/)).toBeDefined();
  expect(screen.getByText("Streak 0")).toBeDefined();
  expect(screen.getByText("Score 0 / 0")).toBeDefined();
  expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
});

test("a right answer says so, counts the streak and the score, and is recorded", () => {
  const onRecord = shown();
  fireEvent.click(screen.getByRole("button", { name: "Two" }));
  expect(screen.getByRole("status").textContent).toContain("Correct");
  expect(screen.getByRole("status").textContent).toContain("The bigger number is 2.");
  expect(screen.getByText("Streak 1")).toBeDefined();
  expect(screen.getByText("Score 1 / 1")).toBeDefined();
  expect(onRecord).toHaveBeenCalledWith("bigger", "2", true, 1);
});

test("a wrong answer says not quite, shows the right answer and ends the streak", () => {
  const onRecord = shown();
  fireEvent.click(screen.getByRole("button", { name: "Two" }));
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  fireEvent.click(screen.getByRole("button", { name: "One" }));
  expect(screen.getByRole("status").textContent).toContain("Not quite");
  expect(screen.getByRole("status").textContent).toContain("The bigger number is 2.");
  expect(screen.getByText("Streak 0")).toBeDefined();
  expect(screen.getByText("Score 1 / 2")).toBeDefined();
  expect(onRecord).toHaveBeenLastCalledWith("bigger", "2", false, 0);
});

test("Next gives a fresh question and hides the feedback", () => {
  const makeQuestion = vi.fn((_context: DrillContext) => ({ bigger: 2 }));
  render(<DrillShell drill={{ ...drill, makeQuestion }} context={context} onRecord={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Two" }));
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(makeQuestion).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole("status")).toBeNull();
});

test("Enter and Space move on after the feedback, and do nothing before it", () => {
  shown();
  fireEvent.keyDown(window, { key: "Enter" });
  expect(screen.queryByRole("status")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Two" }));
  fireEvent.keyDown(window, { key: "Enter" });
  expect(screen.queryByRole("status")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Two" }));
  fireEvent.keyDown(window, { key: " " });
  expect(screen.queryByRole("status")).toBeNull();
  expect(screen.getByText("Score 2 / 2")).toBeDefined();
});

test("the question is made from the context, with the current tallies", () => {
  const makeQuestion = vi.fn((_context: DrillContext) => ({ bigger: 2 }));
  const stats = { "2": { attempts: 1, correct: 0 } };
  render(
    <DrillShell
      drill={{ ...drill, makeQuestion }}
      context={{ ...context, stats }}
      onRecord={vi.fn()}
    />,
  );
  expect(makeQuestion.mock.calls[0]?.[0].stats).toEqual(stats);
});
