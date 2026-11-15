"""Maqamat as interval patterns over 24 steps per octave."""

from dataclasses import dataclass
from itertools import accumulate

from fretless.pitch import DEFAULT_SPELLING, LETTER_STEPS, LETTERS, STEPS_PER_OCTAVE, Letter


@dataclass(frozen=True)
class Maqam:
    id: str
    name: str
    arabic_name: str
    intervals: tuple[int, ...]  # 7 gaps between successive degrees, summing to 24
    default_root: int  # pitch class
    description: str

    def __post_init__(self) -> None:
        if sum(self.intervals) != STEPS_PER_OCTAVE:
            raise ValueError(f"intervals must sum to {STEPS_PER_OCTAVE}: {self.intervals}")


MAQAMAT: dict[str, Maqam] = {
    m.id: m
    for m in (
        Maqam(
            "rast", "Rast", "راست", (4, 3, 3, 4, 4, 3, 3), 0,
            "Close to a major scale, but the 3rd and 7th notes sit a quarter tone lower. "
            "The most common maqam and the home base of Arabic music.",
        ),
        Maqam(
            "bayati", "Bayati", "بياتي", (3, 3, 4, 4, 2, 4, 4), 4,
            "Like a minor scale whose 2nd note is a quarter tone flat. "
            "Warm and folk-like, very common in songs.",
        ),
        Maqam(
            "hijaz", "Hijaz", "حجاز", (2, 6, 2, 4, 2, 4, 4), 4,
            "Like the Phrygian dominant scale you know from flamenco: a big gap between the "
            "2nd and 3rd notes. No quarter tones.",
        ),
        Maqam(
            "nahawand", "Nahawand", "نهاوند", (4, 2, 4, 4, 2, 4, 4), 0,
            "Same as the natural minor scale. No quarter tones.",
        ),
        Maqam(
            "kurd", "Kurd", "كرد", (2, 4, 4, 4, 2, 4, 4), 4,
            "Same as the Phrygian mode (minor with a flat 2nd). No quarter tones.",
        ),
        Maqam(
            "saba", "Saba", "صبا", (3, 3, 2, 6, 2, 4, 4), 4,
            "Sad and tense. The 2nd note is a quarter tone flat and the 4th is lowered a "
            "full semitone, giving it a squeezed, crying sound.",
        ),
        Maqam(
            "ajam", "Ajam", "عجم", (4, 4, 2, 4, 4, 4, 2), 20,
            "Same as the major scale. No quarter tones.",
        ),
        Maqam(
            "sikah", "Sikah", "سيكاه", (3, 4, 4, 3, 3, 4, 3), 7,
            "Starts on a quarter-tone-flat note (E half-flat) and the 5th note is "
            "a quarter tone flat too. Floating and unresolved.",
        ),
    )
}  # fmt: skip


def scale_pitch_classes(maqam: Maqam, root_pc: int) -> tuple[int, ...]:
    """The 7 pitch classes of the scale, starting at the root."""
    steps = (0, *accumulate(maqam.intervals[:-1]))
    return tuple((root_pc + s) % STEPS_PER_OCTAVE for s in steps)


def _alter_to(letter: Letter, pitch_class: int) -> int:
    """Signed step difference from the natural letter to the pitch class, in -12..11."""
    return (pitch_class - LETTER_STEPS[letter] + 12) % STEPS_PER_OCTAVE - 12


def spell_scale(maqam: Maqam, root_pc: int) -> tuple[tuple[Letter, int], ...]:
    """Spell each degree: the root by the default table, then one letter per degree."""
    root_letter, root_alter = DEFAULT_SPELLING[root_pc % STEPS_PER_OCTAVE]
    first = LETTERS.index(root_letter)
    spelled = [(root_letter, root_alter)]
    for i, pc in enumerate(scale_pitch_classes(maqam, root_pc)[1:], start=1):
        letter = LETTERS[(first + i) % len(LETTERS)]
        spelled.append((letter, _alter_to(letter, pc)))
    return tuple(spelled)


def ascending_octave(maqam: Maqam, root_pc: int, lowest_pitch: int) -> tuple[int, ...]:
    """8 pitches: the lowest root at or above `lowest_pitch`, up the scale to the octave."""
    start = lowest_pitch + (root_pc - lowest_pitch) % STEPS_PER_OCTAVE
    return (start, *(start + s for s in accumulate(maqam.intervals)))
