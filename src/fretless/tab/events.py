"""Events: the notes of one tab column, as sounding guitar pitches."""

from dataclasses import dataclass

from fretless.guitar import fretted_pitch
from fretless.tab.model import TabDocument, TabNote, TabSystem

GUITAR_LINES = 6  # only 6-line systems are converted


@dataclass(frozen=True)
class Event:
    system: int  # index among the document's tab systems, 0-based
    column: int  # character index of the column within its system
    pitches: tuple[int, ...]  # top line first, one per note


def note_pitch(open_pitch: int, capo: int, note: TabNote) -> int:
    """Sounding 24-TET pitch of a parsed `TabNote` (adds 1 step when `note.half`)."""
    return fretted_pitch(open_pitch, capo, note.fret) + int(note.half)


def extract_events(document: TabDocument, strings: tuple[int, ...], capo: int) -> tuple[Event, ...]:
    """Every column of every 6-line system, in document order; `strings` runs string 1 first."""
    systems = [b for b in document.blocks if isinstance(b, TabSystem)]
    return tuple(
        Event(
            number,
            column.index,
            tuple(note_pitch(strings[n.line - 1], capo, n) for n in column.notes),
        )
        for number, system in enumerate(systems)
        if system.lines == GUITAR_LINES
        for column in system.columns
    )
