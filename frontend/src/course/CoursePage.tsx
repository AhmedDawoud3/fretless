import { useState } from "react";
import { fetchCourses, type Lesson } from "../api/client";
import { useRequest } from "../app/useRequest";
import type { PageProps } from "../app/useSharedSettings";
import { loadSettings, saveSettings } from "../explorer/settings";
import { ResetProgress } from "../practice/ResetProgress";
import { completeLesson, firstPendingLesson } from "./courseProgress";
import { LessonList } from "./LessonList";
import { LessonView } from "./LessonView";
import "./course.css";

function pickLesson(
  lessons: readonly Lesson[],
  chosenId: string | null,
  completed: readonly string[],
) {
  const activeId =
    lessons.find((l) => l.id === chosenId)?.id ?? firstPendingLesson(lessons, completed);
  return lessons.find((l) => l.id === activeId) ?? null;
}

function CourseBody({
  lessons,
  tuningId,
  shared,
  neck,
}: PageProps & { lessons: readonly Lesson[]; tuningId: string }) {
  const [completed, setCompleted] = useState<string[]>(() => loadSettings().completedLessons);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const active = pickLesson(lessons, chosenId, completed);

  const handleComplete = (lessonId: string) => {
    const next = completeLesson(completed, lessonId);
    setCompleted(next);
    setChosenId(lessonId);
    saveSettings({ completedLessons: next });
  };

  const resetProgress = () => {
    setCompleted([]);
    setChosenId(null);
    saveSettings({ completedLessons: [] });
  };

  return (
    <section className="course-page" aria-label="Guided course">
      <p className="how-to-practise">
        Work through each lesson in order on the neck below ({completed.length} of {lessons.length}{" "}
        completed). Progress is saved in this browser.
      </p>
      <LessonList
        lessons={lessons}
        selectedId={active?.id ?? null}
        completed={completed}
        onSelect={setChosenId}
      />
      {active && (
        <LessonView
          key={`${tuningId}|${active.id}`}
          lesson={active}
          neck={neck}
          shared={shared}
          tuningId={tuningId}
          onComplete={handleComplete}
        />
      )}
      <ResetProgress
        onReset={resetProgress}
        label="Reset course progress"
        prompt="Erase all completed lessons? This cannot be undone."
      />
    </section>
  );
}

/** Guided Course: 7 progressive guitar-to-oud lessons with live neck verification and saved progress. */
export function CoursePage({ shared, neck }: PageProps) {
  const tuningId = shared.tuningId ?? neck.tuning.id;
  const { value: lessons, failed } = useRequest(tuningId, () => fetchCourses(tuningId));

  if (failed) {
    return (
      <p className="status status-error" role="alert">
        Could not load the course lessons. Start the backend with <code>just api</code>, then
        reload.
      </p>
    );
  }
  if (!lessons) return <p className="status">Loading the course...</p>;
  return <CourseBody lessons={lessons} tuningId={tuningId} shared={shared} neck={neck} />;
}
