/** One sitting with one drill: the run of right answers, and the score. Not kept between visits. */
export type Session = { streak: number; correct: number; attempts: number };

export const NEW_SESSION: Session = { streak: 0, correct: 0, attempts: 0 };

export function nextSession(session: Session, correct: boolean): Session {
  return {
    streak: correct ? session.streak + 1 : 0,
    correct: session.correct + (correct ? 1 : 0),
    attempts: session.attempts + 1,
  };
}
