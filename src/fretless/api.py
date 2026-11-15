"""HTTP boundary: the only module that knows about FastAPI and Pydantic."""

from typing import Annotated

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel

from fretless.maqam import (
    MAQAMAT,
    Maqam,
    ascending_octave,
    scale_pitch_classes,
    spell_scale,
)
from fretless.neck import (
    Location,
    all_locations,
    locations_of,
    lowest_location,
    max_position,
    pitch_at,
)
from fretless.pitch import Letter, NoteName, default_name, spell
from fretless.tuning import TUNINGS, Tuning

app = FastAPI(title="Fretless")

DEFAULT_TUNING = "cc"


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


def _name_out(name: NoteName) -> NoteNameOut:
    return NoteNameOut(letter=name.letter, alter=name.alter, octave=name.octave)


def _tuning_out(tuning: Tuning) -> TuningOut:
    return TuningOut(id=tuning.id, label=tuning.label)


def _maqam_out(maqam: Maqam) -> MaqamOut:
    return MaqamOut(
        id=maqam.id,
        name=maqam.name,
        arabic_name=maqam.arabic_name,
        intervals=list(maqam.intervals),
        default_root=maqam.default_root,
        description=maqam.description,
    )


def _find_tuning(tuning_id: str) -> Tuning:
    if tuning_id not in TUNINGS:
        raise HTTPException(status_code=404, detail=f"unknown tuning: {tuning_id}")
    return TUNINGS[tuning_id]


def _find_maqam(maqam_id: str) -> Maqam:
    if maqam_id not in MAQAMAT:
        raise HTTPException(status_code=404, detail=f"unknown maqam: {maqam_id}")
    return MAQAMAT[maqam_id]


def _location_out(location: Location) -> LocationOut:
    return LocationOut(course=location.course, position=location.position)


def _neck_out(tuning: Tuning) -> NeckOut:
    return NeckOut(
        tuning=_tuning_out(tuning),
        courses=[
            CourseOut(course=i, open_pitch=pitch, max_position=max_position(i))
            for i, pitch in enumerate(tuning.courses, start=1)
        ],
        locations=[
            NeckLocationOut(
                course=loc.course,
                position=loc.position,
                pitch=pitch_at(tuning, loc),
                name=_name_out(default_name(pitch_at(tuning, loc))),
            )
            for loc in all_locations(tuning)
        ],
    )


def _scale_out(maqam: Maqam, root: int, tuning: Tuning) -> ScaleOut:
    classes = scale_pitch_classes(maqam, root)
    spelling = spell_scale(maqam, root)
    degree_of = {pc: i for i, pc in enumerate(classes)}
    locations = []
    for loc in locations_of(tuning, frozenset(classes)):
        pitch = pitch_at(tuning, loc)
        index = degree_of[pitch % 24]
        locations.append(
            ScaleLocationOut(
                course=loc.course,
                position=loc.position,
                pitch=pitch,
                degree=index + 1,
                name=_name_out(spell(pitch, *spelling[index])),
            )
        )
    playback = []
    for i, pitch in enumerate(ascending_octave(maqam, root, min(tuning.courses))):
        found = lowest_location(tuning, pitch)
        playback.append(
            PlaybackOut(
                pitch=pitch,
                name=_name_out(spell(pitch, *spelling[i % 7])),
                location=None if found is None else _location_out(found),
            )
        )
    return ScaleOut(
        maqam=_maqam_out(maqam),
        root=root,
        degrees=[
            DegreeOut(degree=i + 1, pitch_class=pc, letter=letter, alter=alter)
            for i, (pc, (letter, alter)) in enumerate(zip(classes, spelling, strict=True))
        ],
        locations=locations,
        playback=playback,
    )


@app.get("/api/health")
def health() -> Health:
    return Health(status="ok")


@app.get("/api/tunings")
def tunings() -> list[TuningOut]:
    return [_tuning_out(t) for t in TUNINGS.values()]


@app.get("/api/neck/{tuning_id}")
def neck(tuning_id: str) -> NeckOut:
    return _neck_out(_find_tuning(tuning_id))


@app.get("/api/maqamat")
def maqamat() -> list[MaqamOut]:
    return [_maqam_out(m) for m in MAQAMAT.values()]


@app.get("/api/maqamat/{maqam_id}/scale")
def scale(
    maqam_id: str,
    root: Annotated[int | None, Query(ge=0, le=23)] = None,
    tuning: str = DEFAULT_TUNING,
) -> ScaleOut:
    maqam = _find_maqam(maqam_id)
    return _scale_out(maqam, maqam.default_root if root is None else root, _find_tuning(tuning))
