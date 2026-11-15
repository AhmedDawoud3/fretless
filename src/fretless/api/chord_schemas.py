"""Pydantic response models for chords."""

from pydantic import BaseModel

from fretless.api.schemas import NoteNameOut, PlaybackOut
from fretless.pitch import Letter


class SpellingOut(BaseModel):
    letter: Letter
    alter: int


class QualityToneOut(BaseModel):
    semitones: int
    role: str


class QualityOut(BaseModel):
    id: str
    symbol: str
    name: str
    tones: list[QualityToneOut]


class ChordToneOut(BaseModel):
    pitch_class: int
    letter: Letter
    alter: int
    role: str


class ChordInfoOut(BaseModel):
    root: int
    quality_id: str
    symbol: str
    name: SpellingOut
    tones: list[ChordToneOut]


class RoleLocationOut(BaseModel):
    course: int
    position: int
    pitch: int
    name: NoteNameOut
    role: str


class VoicingOut(BaseModel):
    locations: list[RoleLocationOut]
    bass_is_root: bool
    span: int
    open_courses: int


class ChordOut(BaseModel):
    chord: ChordInfoOut
    locations: list[RoleLocationOut]
    voicings: list[VoicingOut]
    arpeggio: list[PlaybackOut]
