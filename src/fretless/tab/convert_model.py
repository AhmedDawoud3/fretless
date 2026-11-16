"""What conversion produces: oud notes placed on courses, plus what was altered to get there."""

from dataclasses import dataclass
from typing import Literal

from fretless.tab.model import TextBlock


@dataclass(frozen=True)
class PlacedNote:
    course: int  # 1 = highest
    position: int  # steps from the nut, 0 = open
    pitch: int


@dataclass(frozen=True)
class PlacedColumn:
    index: int  # character index in the source system
    notes: tuple[PlacedNote, ...]  # ordered by course, top (course 1) first


@dataclass(frozen=True)
class PlacedSystem:
    index: int  # among the document's tab systems, 0-based
    width: int
    bars: tuple[int, ...]
    columns: tuple[PlacedColumn, ...]
    techniques: tuple[tuple[int, int, str], ...] = ()  # (course, column_index, symbol)


type ConvertedBlock = PlacedSystem | TextBlock

AlterationKind = Literal["transposed", "octave_shifted", "chord_reduced", "unsupported_system"]


@dataclass(frozen=True)
class Alteration:
    kind: AlterationKind
    system: int | None  # tab system index, None when it concerns the whole piece
    column: int | None  # character index, None when it concerns a whole system or piece
    message: str  # a plain sentence for the user


@dataclass(frozen=True)
class Converted:
    blocks: tuple[ConvertedBlock, ...]  # in document order
    alterations: tuple[Alteration, ...]
    transposed_steps: int  # whole-piece shift, 0 when none
