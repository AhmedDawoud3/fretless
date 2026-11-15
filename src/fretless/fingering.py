"""Can one left hand stop these notes? A rough, hand-independent model."""

from itertools import pairwise

from fretless.neck import Location

MAX_SPAN = 8  # steps: 4 guitar frets
MAX_FINGERS = 3


def stopped_span(locations: tuple[Location, ...]) -> int:
    """Steps between the lowest and highest stopped position; open courses are ignored."""
    stopped = [loc.position for loc in locations if loc.position > 0]
    return max(stopped) - min(stopped) if stopped else 0


def _fingers(stopped: list[Location]) -> int:
    """Fingers needed: one per note, except a finger bars adjacent courses at one position."""
    ordered = sorted(stopped, key=lambda loc: loc.course)
    barred = sum(
        1
        for before, after in pairwise(ordered)
        if after.course == before.course + 1 and after.position == before.position
    )
    return len(ordered) - barred


def is_fingerable(stopped: tuple[Location, ...]) -> bool:
    """True if the stopped notes (position > 0) fit a span of 4 frets and 3 fingers.

    Adjacent courses stopped at the same position count as one barred finger.
    """
    return stopped_span(stopped) <= MAX_SPAN and _fingers(list(stopped)) <= MAX_FINGERS
