"""Pydantic models for the tab conversion endpoint."""

from typing import Annotated

from pydantic import BaseModel, Field

from fretless.api.guitar_schemas import Capo, Strings
from fretless.tab.convert_model import AlterationKind
from fretless.tab.oud_render import Mode


class GuitarIn(BaseModel):
    """The guitar the tab was written for: `strings` run from string 1 (highest)."""

    strings: Strings
    capo: Capo = 0


class ConvertIn(BaseModel):
    text: Annotated[str, Field(min_length=1, max_length=200_000)]
    guitar: GuitarIn
    oud_tuning: str
    mode: Mode = "frets"


class PlacedNoteOut(BaseModel):
    course: int
    position: int
    pitch: int
    name: str  # letter and ASCII accidental, no octave


class PlacedColumnOut(BaseModel):
    index: int
    notes: list[PlacedNoteOut]


class PlacedSystemOut(BaseModel):
    index: int  # among all tab systems of the document, as in `alterations` and `playback`
    width: int
    bars: list[int]
    labels: list[str]
    columns: list[PlacedColumnOut]


class AlterationOut(BaseModel):
    kind: AlterationKind
    system: int | None
    column: int | None
    message: str


class PlaybackNoteOut(BaseModel):
    pitch: int
    course: int
    position: int


class PlaybackEventOut(BaseModel):
    system: int
    column: int
    tick: int
    notes: list[PlaybackNoteOut]


class SummaryOut(BaseModel):
    notes_in: int
    notes_out: int
    transposed_steps: int
    octave_shifted: int
    chords_reduced: int
    unsupported_systems: int


class ConvertOut(BaseModel):
    text: str
    systems: list[PlacedSystemOut]
    alterations: list[AlterationOut]
    playback: list[PlaybackEventOut]
    summary: SummaryOut
    guitar_systems: list[PlacedSystemOut] = []
    guitar_playback: list[PlaybackEventOut] = []
