import type { Lesson } from "../api/client";

type LessonListProps = {
  lessons: readonly Lesson[];
  selectedId: string | null;
  completed: readonly string[];
  onSelect: (id: string) => void;
};

/** Cards for the guided curriculum lessons, showing which ones are completed. */
export function LessonList({ lessons, selectedId, completed, onSelect }: LessonListProps) {
  return (
    <section className="lesson-picker" aria-label="Course lessons">
      {lessons.map((lesson) => {
        const done = completed.includes(lesson.id);
        return (
          <button
            key={lesson.id}
            type="button"
            className="drill-card lesson-card"
            aria-pressed={lesson.id === selectedId}
            onClick={() => onSelect(lesson.id)}
          >
            <strong>{lesson.title}</strong>
            <small>{lesson.summary}</small>
            <span className={done ? "lesson-badge lesson-done" : "lesson-badge"}>
              {done ? "Completed" : "Not started"}
            </span>
          </button>
        );
      })}
    </section>
  );
}
