"""Pydantic models for the guitar endpoints."""

from typing import Annotated

from pydantic import BaseModel, Field

from fretless.api.chord_schemas import SpellingOut
from fretless.api.schemas import NoteNameOut

StringPitch = Annotated[int, Field(ge=24, le=144, multiple_of=2)]
Fret = Annotated[int, Field(ge=0, le=24)]


class GuitarStringOut(BaseModel):
    string: int
    pitch: int
    name: NoteNameOut


class GuitarTuningOut(BaseModel):
    id: str
    label: str
    strings: list[GuitarStringOut]


class IdentifyIn(BaseModel):
    """A shape: `strings` and `frets` both list string 1 (highest) first; null fret = muted."""

    strings: Annotated[list[StringPitch], Field(min_length=6, max_length=6)]
    capo: Annotated[int, Field(ge=0, le=12)] = 0
    frets: Annotated[list[Fret | None], Field(min_length=6, max_length=6)]


class GuitarNoteOut(BaseModel):
    string: int
    fret: int
    pitch: int
    name: NoteNameOut


class MatchOut(BaseModel):
    root: int
    quality_id: str
    symbol: str
    name: SpellingOut
    bass: SpellingOut
    missing: list[str]


class IdentifyOut(BaseModel):
    notes: list[GuitarNoteOut]
    matches: list[MatchOut]
