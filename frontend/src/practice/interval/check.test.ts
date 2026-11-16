import { expect, test } from "vitest";
import { INTERVALS } from "../../testApi";
import { checkInterval } from "./check";
import type { IntervalQuestion } from "./question";

const fifth = INTERVALS.find((i) => i.id === "perfect_fifth");
if (!fifth) throw new Error("fixture has no fifth");
const question: IntervalQuestion = { low: 70, interval: fifth, options: INTERVALS };

test("choosing the played interval is correct", () => {
  expect(checkInterval(question, "perfect_fifth").correct).toBe(true);
});

test("choosing another interval is wrong", () => {
  expect(checkInterval(question, "perfect_fourth").correct).toBe(false);
});
