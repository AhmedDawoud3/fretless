import { useCallback, useRef, useState } from "react";
import type { Drill, DrillResult, ShellProps } from "./drill";
import { Feedback } from "./Feedback";
import { ScoreLine } from "./ScoreLine";
import { NEW_SESSION, nextSession } from "./session";
import { useAdvanceKeys } from "./useAdvanceKeys";

type DrillShellProps<Q, A, R extends DrillResult> = ShellProps & { drill: Drill<Q, A, R> };

/**
 * The frame every drill sits in: the question and its answer UI (the drill's own view),
 * feedback, "Next", the streak and the score. No timers and no penalties.
 */
export function DrillShell<Q, A, R extends DrillResult>({
  drill,
  context,
  onRecord,
  random = Math.random,
}: DrillShellProps<Q, A, R>) {
  const [question, setQuestion] = useState(() => drill.makeQuestion(context, random));
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<R | null>(null);
  const [session, setSession] = useState(NEW_SESSION);
  const nextButton = useRef<HTMLButtonElement>(null);

  const next = useCallback(() => {
    setQuestion(drill.makeQuestion(context, random));
    setResult(null);
    setRound((n) => n + 1);
  }, [drill, context, random]);
  useAdvanceKeys(result !== null, next, nextButton);

  const answer = (given: A) => {
    if (result !== null) return;
    const checked = drill.check(question, given);
    const after = nextSession(session, checked.correct);
    setResult(checked);
    setSession(after);
    onRecord(drill.id, drill.itemKey(question), checked.correct, after.streak);
  };

  return (
    <section className="drill-shell" aria-label={drill.title}>
      <ScoreLine session={session} />
      <drill.View
        key={round}
        context={context}
        question={question}
        result={result}
        onAnswer={answer}
      />
      {result && (
        <>
          <Feedback correct={result.correct} sentence={drill.describe(question, result, context)} />
          <button type="button" ref={nextButton} className="next-button" onClick={next}>
            Next
          </button>
        </>
      )}
    </section>
  );
}
