import type { Session } from "./session";

/** The current run of right answers and the score of this sitting. */
export function ScoreLine({ session }: { session: Session }) {
  return (
    <p className="score-line">
      <span>Streak {session.streak}</span>
      <span>
        Score {session.correct} / {session.attempts}
      </span>
    </p>
  );
}
