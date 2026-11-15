"""Every way to play a set of pitches at once: one note per course, within one hand."""

from functools import cache
from itertools import product

from fretless.fingering import is_fingerable
from fretless.neck import Location, max_position
from fretless.tab.convert_model import PlacedNote
from fretless.tuning import Tuning


def _spots(tuning: Tuning, pitch: int) -> tuple[PlacedNote, ...]:
    return tuple(
        PlacedNote(course, pitch - open_pitch, pitch)
        for course, open_pitch in enumerate(tuning.courses, start=1)
        if 0 <= pitch - open_pitch <= max_position(course)
    )


def _playable(notes: tuple[PlacedNote, ...]) -> bool:
    courses = {n.course for n in notes}
    stopped = tuple(Location(n.course, n.position) for n in notes if n.position > 0)
    return len(courses) == len(notes) and is_fingerable(stopped)


@cache
def placements(tuning: Tuning, pitches: tuple[int, ...]) -> tuple[tuple[PlacedNote, ...], ...]:
    """All playable placements of exactly `pitches`, each ordered by course (1 first)."""
    found = (
        tuple(sorted(combo, key=lambda n: n.course))
        for combo in product(*(_spots(tuning, p) for p in pitches))
    )
    return tuple(notes for notes in found if _playable(notes))
