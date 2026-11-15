"""The oud neck: which pitches sound where."""

from dataclasses import dataclass

from fretless.pitch import STEPS_PER_OCTAVE
from fretless.tuning import Tuning

FIFTH = 14


def max_position(course: int) -> int:
    """Neck range in steps: an octave on course 1, a fifth on every other course."""
    return STEPS_PER_OCTAVE if course == 1 else FIFTH


@dataclass(frozen=True)
class Location:
    course: int  # 1-based, 1 = highest
    position: int  # steps from the nut, 0 = open


def pitch_at(tuning: Tuning, location: Location) -> int:
    return tuning.courses[location.course - 1] + location.position


def all_locations(tuning: Tuning) -> tuple[Location, ...]:
    return tuple(
        Location(course, position)
        for course in range(1, len(tuning.courses) + 1)
        for position in range(max_position(course) + 1)
    )


def locations_of(tuning: Tuning, pitch_classes: frozenset[int]) -> tuple[Location, ...]:
    return tuple(
        loc
        for loc in all_locations(tuning)
        if pitch_at(tuning, loc) % STEPS_PER_OCTAVE in pitch_classes
    )


def lowest_location(tuning: Tuning, pitch: int) -> Location | None:
    """The location with the smallest position sounding `pitch`.

    On a tie the lower course number (higher course) wins; the shipped tunings never tie.
    """
    matches = [loc for loc in all_locations(tuning) if pitch_at(tuning, loc) == pitch]
    return min(matches, key=lambda loc: (loc.position, loc.course), default=None)
