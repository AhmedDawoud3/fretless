import { useState } from "react";
import type { Lesson, LessonStep, NeckOut } from "../api/client";
import type { SharedSettings } from "../app/useSharedSettings";
import { playSteps } from "../audio";
import { describePlay, rulerLabelFor } from "../explorer/readout";
import { DEFAULT_TEMPO } from "../explorer/tempo";
import { usePlayback } from "../explorer/usePlayback";
import { OudNeck } from "../neck/OudNeck";
import type { Play } from "../neck/play";
import { formatVirtualFret } from "../notation/virtualFret";
import { isStepHit, lessonMarkers } from "./courseProgress";

type LessonViewProps = {
  lesson: Lesson;
  neck: NeckOut;
  shared: SharedSettings;
  tuningId: string;
  onComplete: (lessonId: string) => void;
};

function stepPrompt(lesson: Lesson, stepIndex: number): string {
  const step = lesson.steps[stepIndex];
  if (!step) return "Lesson complete! Pick another lesson above or restart to review.";
  return `Step ${stepIndex + 1} of ${lesson.steps.length}: Play ${step.label} on course ${step.course} (fret ${formatVirtualFret(step.position)})`;
}

function wrongNoteMessage(
  neck: NeckOut,
  hit: Play,
  expected: LessonStep,
  system: SharedSettings["system"],
): string {
  const heard = describePlay(neck, hit, system)?.name ?? "that note";
  return `Heard ${heard}; looking for ${expected.label} on course ${expected.course} (fret ${formatVirtualFret(expected.position)}).`;
}

function toEntries(lesson: Lesson) {
  return lesson.steps.map((s) => ({
    pitch: s.pitch,
    location: { course: s.course, position: s.position },
  }));
}

/** Interactive runner for one guided lesson: plays reference audio and checks neck taps step by step. */
export function LessonView({ lesson, neck, shared, tuningId, onComplete }: LessonViewProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const playback = usePlayback(`${tuningId}|${lesson.id}`);

  const togglePlay = () => {
    if (playback.playing) playback.stop();
    else playback.start(toEntries(lesson), DEFAULT_TEMPO);
  };

  const handlePlay = (hit: Play) => {
    playSteps(hit.pitch);
    const expected = lesson.steps[stepIndex];
    if (!expected) return;
    if (!isStepHit(expected, hit)) {
      setFeedback(wrongNoteMessage(neck, hit, expected, shared.system));
      return;
    }
    const next = stepIndex + 1;
    setStepIndex(next);
    setFeedback(`Nice: played ${expected.label}.`);
    if (next === lesson.steps.length) onComplete(lesson.id);
  };

  const restart = () => {
    playback.stop();
    setStepIndex(0);
    setFeedback(null);
  };

  return (
    <section className="lesson-view" aria-label={lesson.title}>
      <div className="lesson-head">
        <h2>{lesson.title}</h2>
        <p className="lesson-tip">{lesson.guitarist_tip}</p>
      </div>
      <div className="controls">
        <button type="button" onClick={togglePlay}>
          {playback.playing ? "Stop" : "Hear lesson"}
        </button>
        <button type="button" onClick={restart}>
          Restart lesson
        </button>
      </div>
      <p className="lesson-prompt">{stepPrompt(lesson, stepIndex)}</p>
      {feedback && (
        <p className="lesson-feedback" role="status">
          {feedback}
        </p>
      )}
      <div className="neck-scroll">
        <OudNeck
          neck={neck}
          markers={lessonMarkers(lesson, stepIndex, playback.location)}
          showGuides={shared.guides}
          snap
          onPlay={handlePlay}
          rulerLabel={rulerLabelFor(shared.guides, shared.labelMode)}
        />
      </div>
    </section>
  );
}
