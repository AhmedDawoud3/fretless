"""Chords: a root pitch class plus a quality (a set of tones above the root)."""

from dataclasses import dataclass

from fretless.pitch import DEFAULT_SPELLING, STEPS_PER_OCTAVE, Letter, spell_above

ROLE_OF_DEGREE = {
    1: "root",
    2: "second",
    3: "third",
    4: "fourth",
    5: "fifth",
    6: "sixth",
    7: "seventh",
}


@dataclass(frozen=True)
class ChordTone:
    semitones: int  # above the root; guitar-style 12-tone, so steps = 2 * semitones
    degree: int  # scale degree used for spelling (a ninth is spelled as a second)
    role: str


@dataclass(frozen=True)
class ChordQuality:
    id: str
    symbol: str  # suffix shown after the root: "", "m", "7", ...
    name: str
    tones: tuple[ChordTone, ...]


def _tone(semitones: int, degree: int) -> ChordTone:
    role = "ninth" if semitones > 12 else ROLE_OF_DEGREE[degree]
    return ChordTone(semitones, degree, role)


def _quality(id: str, symbol: str, name: str, *tones: tuple[int, int]) -> ChordQuality:
    return ChordQuality(id, symbol, name, tuple(_tone(s, d) for s, d in tones))


QUALITIES: dict[str, ChordQuality] = {
    q.id: q
    for q in (
        _quality("maj", "", "major", (0, 1), (4, 3), (7, 5)),
        _quality("min", "m", "minor", (0, 1), (3, 3), (7, 5)),
        _quality("7", "7", "dominant 7th", (0, 1), (4, 3), (7, 5), (10, 7)),
        _quality("maj7", "maj7", "major 7th", (0, 1), (4, 3), (7, 5), (11, 7)),
        _quality("m7", "m7", "minor 7th", (0, 1), (3, 3), (7, 5), (10, 7)),
        _quality("dim", "dim", "diminished", (0, 1), (3, 3), (6, 5)),
        _quality("aug", "aug", "augmented", (0, 1), (4, 3), (8, 5)),
        _quality("sus2", "sus2", "suspended 2nd", (0, 1), (2, 2), (7, 5)),
        _quality("sus4", "sus4", "suspended 4th", (0, 1), (5, 4), (7, 5)),
        _quality("5", "5", "power chord", (0, 1), (7, 5)),
        _quality("6", "6", "major 6th", (0, 1), (4, 3), (7, 5), (9, 6)),
        _quality("m6", "m6", "minor 6th", (0, 1), (3, 3), (7, 5), (9, 6)),
        _quality("dim7", "dim7", "diminished 7th", (0, 1), (3, 3), (6, 5), (9, 7)),
        _quality("m7b5", "m7b5", "half-diminished 7th", (0, 1), (3, 3), (6, 5), (10, 7)),
        _quality("add9", "add9", "major add 9", (0, 1), (4, 3), (7, 5), (14, 2)),
        _quality("9", "9", "dominant 9th", (0, 1), (4, 3), (7, 5), (10, 7), (14, 2)),
    )
}  # fmt: skip


@dataclass(frozen=True)
class Chord:
    root: int  # pitch class, 0..23
    quality: ChordQuality

    def __post_init__(self) -> None:
        if not 0 <= self.root < STEPS_PER_OCTAVE:
            raise ValueError(f"root must be a pitch class 0..23: {self.root}")


def chord_pitch_classes(chord: Chord) -> tuple[int, ...]:
    """The chord's pitch classes in tone order (root first)."""
    return tuple((chord.root + 2 * t.semitones) % STEPS_PER_OCTAVE for t in chord.quality.tones)


def spell_chord(chord: Chord) -> tuple[tuple[Letter, int], ...]:
    """Spell each tone: the root by the default table, the rest by their degree's letter."""
    root_letter, root_alter = DEFAULT_SPELLING[chord.root]
    return (
        (root_letter, root_alter),
        *(
            spell_above(root_letter, t.degree - 1, pc)
            for t, pc in zip(chord.quality.tones[1:], chord_pitch_classes(chord)[1:], strict=True)
        ),
    )


def essential_roles(quality: ChordQuality) -> frozenset[str]:
    """Roles a reduced voicing must keep: the root, the colour tone, and any seventh."""
    roles = {t.role for t in quality.tones}
    colour = next(r for r in ("third", "second", "fourth", "fifth") if r in roles)
    return frozenset({"root", colour} | (roles & {"seventh"}))
