import type { ComponentType, ReactNode } from "react";
import type { Interval, Maqam, NeckOut } from "../api/client";
import type { NamingSystem } from "../notation/noteName";
import type { Tally } from "./progress";

/** Everything a drill may read: the oud, the interval list, the user's settings and past answers. */
export type DrillContext = {
  neck: NeckOut;
  intervals: readonly Interval[];
  maqamat: readonly Maqam[];
  system: NamingSystem;
  guides: boolean;
  /** The chosen difficulty, one of the drill's `levels`. */
  level: number;
  /** This drill's tallies by item key, so questions the user misses come up more often. */
  stats: Readonly<Record<string, Tally>>;
};

/** What `check` says. A drill may add more fields (tries, the right answer) for its view. */
export type DrillResult = { correct: boolean };

export type DrillLevel = { level: number; label: string };

export type DrillViewProps<Q, A, R extends DrillResult> = {
  context: DrillContext;
  question: Q;
  /** Null until answered; then the view shows the right answer and stops taking input. */
  result: R | null;
  /** Called once per question, with the final answer. */
  onAnswer: (answer: A) => void;
  /** Moves on to a new question without recording anything: for a question that cannot be answered. */
  onSkip: () => void;
};

/**
 * One drill. Q is a question, A an answer, R the checked result.
 * `makeQuestion` and `check` are pure; the shell owns score, streak, progress and "Next".
 */
export type Drill<Q, A, R extends DrillResult> = {
  id: string;
  title: string;
  /** One line for the picker. */
  blurb: string;
  levels: readonly DrillLevel[];
  makeQuestion(context: DrillContext, random: () => number): Q;
  /** What this question teaches, for the per-item tallies: a pitch class, an interval id. */
  itemKey(question: Q): string;
  check(question: Q, answer: A): R;
  /** One plain sentence stating the right answer, shown under "Correct" or "Not quite". */
  describe(question: Q, result: R, context: DrillContext): string;
  /** Renders the question and collects the answer; shows the answer on the oud once `result` is set. */
  View: ComponentType<DrillViewProps<Q, A, R>>;
};

/** Reports one answer to be kept: the drill, the item, right or wrong, and the streak after it. */
export type RecordAnswer = (
  drillId: string,
  itemKey: string,
  correct: boolean,
  streak: number,
) => void;

export type ShellProps = {
  context: DrillContext;
  onRecord: RecordAnswer;
  /** Injected for tests; the page leaves it out. */
  random?: () => number;
};

/** A drill as the page sees it: its card, and a ready shell. Part of the registry. */
export type DrillEntry = Pick<
  Drill<never, never, DrillResult>,
  "id" | "title" | "blurb" | "levels"
> & {
  /** The drill inside its shell. */
  render: (props: ShellProps) => ReactNode;
};
