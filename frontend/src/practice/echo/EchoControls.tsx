import type { DrillContext } from "../drill";
import { nameOfPitch } from "../neckLookup";
import { spokenName } from "../spokenName";

/** The reference note in words, and the open course it is played on. */
export function ReferenceLine({
  context,
  reference,
}: {
  context: DrillContext;
  reference: number;
}) {
  const { neck, system } = context;
  const name = nameOfPitch(neck, reference);
  const course = neck.courses.find((c) => c.open_pitch === reference)?.course;
  return (
    <p>
      Reference: <strong>{name ? spokenName(name, system) : "?"}</strong>
      {course && ` (open course ${course})`}
    </p>
  );
}

type EchoActionsProps = {
  answered: boolean;
  tries: number;
  onAgain: () => void;
  onGiveUp: () => void;
};

/** Hear it again, give up, and how many presses so far. */
export function EchoActions({ answered, tries, onAgain, onGiveUp }: EchoActionsProps) {
  return (
    <p className="drill-actions">
      <button type="button" onClick={onAgain}>
        Hear it again
      </button>
      <button type="button" disabled={answered} onClick={onGiveUp}>
        Show me
      </button>
      <span>Tries: {tries}</span>
    </p>
  );
}
