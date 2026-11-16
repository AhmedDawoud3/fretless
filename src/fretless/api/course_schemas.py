"""Pydantic response models for the guided course endpoint."""

from pydantic import BaseModel


class LessonStepOut(BaseModel):
    course: int
    position: int
    pitch: int
    label: str


class LessonOut(BaseModel):
    id: str
    number: int
    title: str
    summary: str
    guitarist_tip: str
    steps: list[LessonStepOut]
