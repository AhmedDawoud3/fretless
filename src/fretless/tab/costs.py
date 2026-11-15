"""Cost weights and cost functions for choosing where on the oud each event is played."""

from fretless.fingering import stopped_span
from fretless.neck import Location
from fretless.tab.convert_model import PlacedNote

# ponytail: hand-tuned weights. Ceiling: tab has no rhythm so there is no time available to
# shift the hand, and there is no left-hand finger model (only the span / barre rule in
# fingering.py). Upgrade path: weigh moves by note duration, or fit the weights to
# fingerings transcribed by oud players.
W_STOPPED = 3  # a stopped note costs more than an open one, whatever its position
W_POSITION = 2  # per step above the nut
W_SPAN = 2  # per step between the lowest and highest stopped note of a chord
W_GAP = 3  # per course skipped inside a chord
W_SHIFT = 4  # per step the hand position moves between events
W_JUMP = 3  # per course skipped between consecutive single notes


def local_cost(notes: tuple[PlacedNote, ...]) -> int:
    """How awkward one placement is on its own; lower is easier."""
    stopped = [n for n in notes if n.position > 0]
    courses = [n.course for n in notes]
    gaps = max(courses) - min(courses) + 1 - len(courses)
    span = stopped_span(tuple(Location(n.course, n.position) for n in stopped))
    return (
        W_STOPPED * len(stopped)
        + W_POSITION * sum(n.position for n in notes)
        + W_SPAN * span
        + W_GAP * gaps
    )


def hand_position(notes: tuple[PlacedNote, ...]) -> int | None:
    """The lowest stopped position, or None when every note is open (the hand stays put)."""
    return min((n.position for n in notes if n.position > 0), default=None)


def move_cost(before: tuple[PlacedNote, ...], after: tuple[PlacedNote, ...]) -> int:
    """Cost of a course jump between two single notes; chords have no such cost."""
    if len(before) != 1 or len(after) != 1:
        return 0
    return W_JUMP * max(abs(before[0].course - after[0].course) - 1, 0)


def shift_cost(hand: int | None, new_hand: int | None) -> int:
    """Cost of moving the hand between positions; no cost when either is unknown or open."""
    if hand is None or new_hand is None:
        return 0
    return W_SHIFT * abs(hand - new_hand)
