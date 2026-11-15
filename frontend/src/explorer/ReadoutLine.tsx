import { formatCents, type Readout as ReadoutData } from "./readout";

export function ReadoutLine({ readout }: { readout: ReadoutData | null }) {
  if (!readout) return <p className="readout">Press a string to play it.</p>;
  const cents = formatCents(readout.cents);
  return (
    <p className="readout" aria-live="polite">
      Course {readout.course} · fret {readout.fret} · <strong>{readout.name}</strong>
      {cents && <span className="cents"> ({cents})</span>}
    </p>
  );
}
