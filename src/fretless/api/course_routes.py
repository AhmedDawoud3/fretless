"""Guided course routes."""

from fastapi import APIRouter

from fretless.api.course_mappers import lesson_out
from fretless.api.course_schemas import LessonOut
from fretless.api.lookup import DEFAULT_TUNING, find
from fretless.course import lessons_for_tuning
from fretless.tuning import TUNINGS

router = APIRouter()


@router.get("/api/courses")
def courses(tuning: str = DEFAULT_TUNING) -> list[LessonOut]:
    found = find(TUNINGS, tuning, "tuning")
    return [lesson_out(lesson) for lesson in lessons_for_tuning(found)]
