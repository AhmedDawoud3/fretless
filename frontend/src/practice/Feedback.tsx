type FeedbackProps = { correct: boolean; sentence: string };

/** The verdict on the last answer, then the right answer in words. */
export function Feedback({ correct, sentence }: FeedbackProps) {
  return (
    <p role="status" className={correct ? "feedback feedback-right" : "feedback feedback-wrong"}>
      <strong>{correct ? "Correct." : "Not quite."}</strong> {sentence}
    </p>
  );
}
