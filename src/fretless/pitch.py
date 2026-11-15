"""Pitch arithmetic. A pitch is an int: quarter-tone steps above C0."""

from dataclasses import dataclass
from typing import Literal

STEPS_PER_OCTAVE = 24

Letter = Literal["C", "D", "E", "F", "G", "A", "B"]

LETTERS: tuple[Letter, ...] = ("C", "D", "E", "F", "G", "A", "B")
LETTER_STEPS: dict[Letter, int] = {"C": 0, "D": 4, "E": 8, "F": 10, "G": 14, "A": 18, "B": 22}

# Fixed spelling per pitch class: (letter, alter).
DEFAULT_SPELLING: tuple[tuple[Letter, int], ...] = (
    ("C", 0), ("C", 1), ("C", 2), ("D", -1), ("D", 0), ("D", 1),
    ("E", -2), ("E", -1), ("E", 0), ("E", 1), ("F", 0), ("F", 1),
    ("F", 2), ("G", -1), ("G", 0), ("G", 1), ("A", -2), ("A", -1),
    ("A", 0), ("A", 1), ("B", -2), ("B", -1), ("B", 0), ("B", 1),
)  # fmt: skip


def spell_above(root_letter: Letter, letters_up: int, pitch_class: int) -> tuple[Letter, int]:
    """Spell `pitch_class` on the letter `letters_up` letters above `root_letter`.

    The alter is the signed step difference from that natural letter, in -12..11.
    """
    letter = LETTERS[(LETTERS.index(root_letter) + letters_up) % len(LETTERS)]
    return letter, (pitch_class - LETTER_STEPS[letter] + 12) % STEPS_PER_OCTAVE - 12


@dataclass(frozen=True)
class NoteName:
    """A spelled note. `alter` is steps from the natural letter (-2 flat ... +2 sharp)."""

    letter: Letter
    alter: int
    octave: int


def name_to_pitch(name: NoteName) -> int:
    return name.octave * STEPS_PER_OCTAVE + LETTER_STEPS[name.letter] + name.alter


def spell(pitch: int, letter: Letter, alter: int) -> NoteName:
    """Name `pitch` as letter+alter, choosing the octave that makes it exact."""
    octave = (pitch - LETTER_STEPS[letter] - alter) // STEPS_PER_OCTAVE
    return NoteName(letter, alter, octave)


def default_name(pitch: int) -> NoteName:
    letter, alter = DEFAULT_SPELLING[pitch % STEPS_PER_OCTAVE]
    return spell(pitch, letter, alter)
