import { GREEN_ZONE, needlePercent } from "./needle";

/** A tuner needle on a scale from -50 to +50 cents, with the green zone for "in tune". Null: nothing to show. */
export function Meter({ cents }: { cents: number | null }) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: a native <meter> cannot be styled with a needle and a green zone
    <div
      className="meter"
      role="meter"
      aria-label="How far from the note, in cents"
      aria-valuemin={-50}
      aria-valuemax={50}
      aria-valuenow={cents ?? undefined}
    >
      <div
        className="meter-zone"
        style={{ left: `${GREEN_ZONE.left}%`, width: `${GREEN_ZONE.width}%` }}
      />
      {cents !== null && (
        <div className="meter-needle" style={{ left: `${needlePercent(cents)}%` }} />
      )}
      <span className="meter-end meter-flat">flat</span>
      <span className="meter-end meter-sharp">sharp</span>
    </div>
  );
}
