import { TEMPO_MAX, TEMPO_MIN } from "./tempo";

type PlayScaleProps = {
  playing: boolean;
  onToggle: () => void;
  tempo: number;
  onTempo: (notesPerMinute: number) => void;
  /** What the button and the slider are called; a scale has a tempo, a text tab only a speed. */
  words?: { play: string; rate: string };
};

const SCALE_WORDS = { play: "Play scale", rate: "Tempo" };

export function PlayScale({
  playing,
  onToggle,
  tempo,
  onTempo,
  words = SCALE_WORDS,
}: PlayScaleProps) {
  return (
    <div className="control">
      <button type="button" onClick={onToggle}>
        {playing ? "Stop" : words.play}
      </button>
      <label className="control">
        {words.rate} ({tempo} notes per minute)
        <input
          type="range"
          min={TEMPO_MIN}
          max={TEMPO_MAX}
          step={10}
          value={tempo}
          onChange={(event) => onTempo(Number(event.target.value))}
        />
      </label>
    </div>
  );
}
