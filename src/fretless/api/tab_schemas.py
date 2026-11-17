"""Pydantic models for the tab conversion endpoint."""

from typing import Annotated, Literal

from pydantic import BaseModel, Field

from fretless.api.guitar_schemas import Capo, Strings
from fretless.tab.convert_model import AlterationKind
from fretless.tab.oud_render import Mode

ImportKind = Literal["auto", "tab", "chords", "sheet"]


class ImportUrlIn(BaseModel):
    url: Annotated[str, Field(min_length=1, max_length=2_000)]
    kind: ImportKind = "auto"
    track: Annotated[int | None, Field(ge=0)] = None


class ImportPdfIn(BaseModel):
    pdf_base64: Annotated[str, Field(min_length=1, max_length=20_000_000)]
    filename: Annotated[str, Field(max_length=260)] = ""
    kind: ImportKind = "auto"


class ImportedTrackOut(BaseModel):
    index: int
    name: str
    instrument: str
    is_vocal: bool = False


class ImportTabOut(BaseModel):
    title: str
    source: str
    kind: str
    text: str
    strings: list[int] | None = None
    capo: int = 0
    tempo: int | None = None
    track_index: int | None = None
    tracks: list[ImportedTrackOut] = []


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
    techniques: dict[str, str] = {}  # "course:column" -> symbol (h, p, /, \, b, ~)


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


class DetectedMaqamOut(BaseModel):
    maqam_id: str
    maqam_name: str
    arabic_name: str
    root: int
    root_name: str
    confidence: int
    scale_pitches: list[int]


class AudioArrangementOut(BaseModel):
    id: str
    label: str
    stem: str
    fit_score: int
    fit_reason: str
    notes_count: int
    audio_base64: str | None = None
    detected_maqam: list[DetectedMaqamOut] = []
    text: str
    systems: list[PlacedSystemOut]
    alterations: list[AlterationOut]
    playback: list[PlaybackEventOut]
    summary: SummaryOut


class ConvertOut(BaseModel):
    text: str
    systems: list[PlacedSystemOut]
    alterations: list[AlterationOut]
    playback: list[PlaybackEventOut]
    summary: SummaryOut
    guitar_systems: list[PlacedSystemOut] = []
    guitar_playback: list[PlaybackEventOut] = []
    tempo: int | None = None
    detected_maqam: list[DetectedMaqamOut] = []
    active_arrangement_id: str | None = None
    arrangements: list[AudioArrangementOut] = []
