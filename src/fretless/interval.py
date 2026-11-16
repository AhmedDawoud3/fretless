"""The distances between two notes, named for ear-training drills (24 steps per octave)."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Interval:
    steps: int
    id: str
    name: str
    short: str
    frets: str  # guitar wording, a fret being 2 steps: "1 fret", "1½ frets"
    quarter_tone: bool
    level: int  # drill difficulty, 1 (easiest) to 4


def _frets(steps: int) -> str:
    whole, half = divmod(steps, 2)
    count = f"{whole or ('' if half else 0)}{'½' if half else ''}"
    return f"{count} {'fret' if steps == 2 else 'frets'}"


def _interval(steps: int, id_: str, short: str, level: int) -> Interval:
    name = id_.replace("_", " ").capitalize()
    return Interval(steps, id_, name, short, _frets(steps), steps % 2 == 1, level)


# (steps, id, short, level); the name is the id in plain English.
_ROWS = (
    (0, "unison", "P1", 3),
    (2, "minor_second", "m2", 2),
    (3, "neutral_second", "n2", 4),
    (4, "major_second", "M2", 2),
    (6, "minor_third", "m3", 1),
    (7, "neutral_third", "n3", 4),
    (8, "major_third", "M3", 1),
    (10, "perfect_fourth", "P4", 1),
    (11, "wide_fourth", "w4", 4),
    (12, "tritone", "TT", 3),
    (14, "perfect_fifth", "P5", 1),
    (16, "minor_sixth", "m6", 2),
    (17, "neutral_sixth", "n6", 4),
    (18, "major_sixth", "M6", 2),
    (20, "minor_seventh", "m7", 3),
    (21, "neutral_seventh", "n7", 4),
    (22, "major_seventh", "M7", 3),
    (24, "octave", "P8", 1),
)

INTERVALS: dict[int, Interval] = {
    steps: _interval(steps, id_, short, level) for steps, id_, short, level in _ROWS
}


def interval_between(low: int, high: int) -> Interval | None:
    """The interval from `low` up to `high`; None if downward, over an octave or unnamed."""
    return INTERVALS.get(high - low)
