import { TEMPO_MAX, TEMPO_MIN } from "./tempo";

type PlayScaleProps = {
  playing: boolean;
  onToggle: () => void;
  tempo: number;
  onTempo: (notesPerMinute: number) => void;
};

export function PlayScale({ playing, onToggle, tempo, onTempo }: PlayScaleProps) {
  return (
    <div className="control">
      <button type="button" onClick={onToggle}>
        {playing ? "Stop" : "Play scale"}
      </button>
      <label className="control">
        Tempo ({tempo} notes per minute)
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
