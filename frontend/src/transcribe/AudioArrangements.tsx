import type { AudioArrangement, Converted } from "../api/client";

/** Project the selected stem arrangement onto the top-level `Converted` fields for `TabResult`. */
export function applyArrangement(
  converted: Converted,
  selectedId: string | null,
): {
  activeId: string | null;
  activeArrangement: AudioArrangement | null;
  view: Converted;
} {
  const list = converted.arrangements ?? [];
  if (list.length === 0) return { activeId: null, activeArrangement: null, view: converted };
  const active =
    list.find((item) => item.id === selectedId) ??
    list.find((item) => item.id === converted.active_arrangement_id) ??
    list[0] ??
    null;
  if (!active) return { activeId: null, activeArrangement: null, view: converted };
  const detectedMaqam =
    active.detected_maqam && active.detected_maqam.length > 0
      ? active.detected_maqam
      : converted.detected_maqam;
  return {
    activeId: active.id,
    activeArrangement: active,
    view: {
      ...converted,
      text: active.text,
      systems: active.systems,
      alterations: active.alterations,
      playback: active.playback,
      summary: active.summary,
      detected_maqam: detectedMaqam,
    },
  };
}

type AudioArrangementsProps = {
  arrangements: readonly AudioArrangement[];
  activeId: string | null;
  activeArrangement: AudioArrangement | null;
  onSelect: (id: string) => void;
};

function audioSrcFor(base64: string): string {
  if (base64.startsWith("UklGR")) return `data:audio/wav;base64,${base64}`;
  if (base64.startsWith("T2dn")) return `data:audio/ogg;base64,${base64}`;
  return `data:audio/mpeg;base64,${base64}`;
}

/** Switch between stem-separated Oud arrangements (Vocals, Lead Melody, Chords, Bass) and preview stem audio. */
export function AudioArrangements({
  arrangements,
  activeId,
  activeArrangement,
  onSelect,
}: AudioArrangementsProps) {
  if (arrangements.length === 0) return null;
  const stemAudio = activeArrangement?.audio_base64 ?? null;

  return (
    <section className="audio-arrangements" aria-label="Oud arrangements">
      <fieldset className="arrangement-pills" aria-label="Separated track options">
        {arrangements.map((arr) => (
          <button
            key={arr.id}
            type="button"
            className="arrangement-pill"
            aria-pressed={arr.id === activeId}
            onClick={() => onSelect(arr.id)}
          >
            <span>{arr.label}</span>
            <span className="arrangement-score">{arr.fit_score}% fit</span>
          </button>
        ))}
      </fieldset>
      {activeArrangement && <p className="arrangement-reason">{activeArrangement.fit_reason}</p>}
      {stemAudio && activeArrangement && (
        <div className="stem-audio-preview">
          <span>
            Isolated stem audio: <strong>{activeArrangement.stem}</strong>
          </span>
          <audio
            key={activeArrangement.id}
            controls
            src={audioSrcFor(stemAudio)}
            aria-label="Isolated stem audio"
          >
            <track kind="captions" label="Isolated stem audio" />
          </audio>
        </div>
      )}
    </section>
  );
}
