"""Note-name conversions shared by every mapper."""

from fretless.api.schemas import NoteNameOut
from fretless.pitch import NoteName


def name_out(name: NoteName) -> NoteNameOut:
    return NoteNameOut(letter=name.letter, alter=name.alter, octave=name.octave)
