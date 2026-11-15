"""Pydantic response models: the JSON shapes the API serves."""

from pydantic import BaseModel

from fretless.pitch import Letter


class Health(BaseModel):
    status: str


class NoteNameOut(BaseModel):
    letter: Letter
    alter: int
    octave: int


class TuningOut(BaseModel):
    id: str
    label: str


class CourseOut(BaseModel):
    course: int
    open_pitch: int
    max_position: int


class NeckLocationOut(BaseModel):
    course: int
    position: int
    pitch: int
    name: NoteNameOut


class NeckOut(BaseModel):
    tuning: TuningOut
    courses: list[CourseOut]
    locations: list[NeckLocationOut]


class MaqamOut(BaseModel):
    id: str
    name: str
    arabic_name: str
    intervals: list[int]
    default_root: int
    description: str


class DegreeOut(BaseModel):
    degree: int
    pitch_class: int
    letter: Letter
    alter: int


class ScaleLocationOut(NeckLocationOut):
    degree: int


class LocationOut(BaseModel):
    course: int
    position: int


class PlaybackOut(BaseModel):
    pitch: int
    name: NoteNameOut
    location: LocationOut | None


class ScaleOut(BaseModel):
    maqam: MaqamOut
    root: int
    degrees: list[DegreeOut]
    locations: list[ScaleLocationOut]
    playback: list[PlaybackOut]
