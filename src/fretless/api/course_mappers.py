"""Pure functions mapping domain lessons to response schemas."""

from fretless.api.course_schemas import LessonOut, LessonStepOut
from fretless.course import Lesson, LessonStep


def _step_out(step: LessonStep) -> LessonStepOut:
    return LessonStepOut(
        course=step.course, position=step.position, pitch=step.pitch, label=step.label
    )


def lesson_out(lesson: Lesson) -> LessonOut:
    return LessonOut(
        id=lesson.id,
        number=lesson.number,
        title=lesson.title,
        summary=lesson.summary,
        guitarist_tip=lesson.guitarist_tip,
        steps=[_step_out(step) for step in lesson.steps],
    )
