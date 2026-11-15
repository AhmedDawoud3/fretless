"""Print converted oud tab as ASCII text, in frets, note names or both."""

from typing import Literal

from fretless.pitch import default_name
from fretless.tab.convert_model import Converted, PlacedNote, PlacedSystem
from fretless.tab.model import TextBlock
from fretless.tab.render import render_document
from fretless.tab.render_model import RenderCell, RenderSystem
from fretless.tuning import Tuning

Mode = Literal["frets", "names", "both"]

# ASCII-safe accidentals so pasted tab survives any editor: alter in steps -> symbol.
ACCIDENTALS = {-2: "b", -1: "d", 0: "", 1: "+", 2: "#"}


def ascii_name(pitch: int) -> str:
    """Letter plus accidental, no octave: "C", "Bb", "F#", "C+" (half-sharp), "Dd" (half-flat)."""
    name = default_name(pitch)
    return name.letter + ACCIDENTALS[name.alter]


def course_labels(tuning: Tuning) -> tuple[str, ...]:
    return tuple(ascii_name(p) for p in tuning.courses)


def fret_text(position: int) -> str:
    """Virtual fret: position / 2, with ".5" for a quarter tone."""
    return f"{position // 2}.5" if position % 2 else str(position // 2)


def cell_text(note: PlacedNote, mode: Mode) -> str:
    fret, name = fret_text(note.position), ascii_name(note.pitch)
    return {"frets": fret, "names": name, "both": f"{fret}({name})"}[mode]


def _render_system(system: PlacedSystem, tuning: Tuning, mode: Mode) -> RenderSystem:
    cells = tuple(
        RenderCell(note.course, column.index, cell_text(note, mode))
        for column in system.columns
        for note in column.notes
    )
    return RenderSystem(course_labels(tuning), system.width, system.bars, cells)


def render_converted(converted: Converted, tuning: Tuning, mode: Mode) -> str:
    return render_document(
        tuple(
            b if isinstance(b, TextBlock) else _render_system(b, tuning, mode)
            for b in converted.blocks
        )
    )
