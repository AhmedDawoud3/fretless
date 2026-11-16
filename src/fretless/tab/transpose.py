"""Fit a piece into the oud's range: one octave shift for the whole piece, then per note."""

from dataclasses import dataclass

from fretless.neck import max_position
from fretless.pitch import STEPS_PER_OCTAVE
from fretless.tuning import Tuning

# Whole-piece shifts in steps, in order of preference when notes-out ties.
SHIFTS = (0, -STEPS_PER_OCTAVE, STEPS_PER_OCTAVE, 2 * STEPS_PER_OCTAVE)


# ponytail: hand-tuned fraction of all notes a whole-piece shift must rescue. Ceiling: every
# note counts the same, so a melody pushed to the top of the range can win over a stray bass
# note. Upgrade path: weigh melody notes above bass notes.
SHIFT_GAIN = 0.25


@dataclass(frozen=True)
class Range:
    low: int  # lowest open course
    high: int  # course 1 at its highest position

    def contains(self, pitch: int) -> bool:
        return self.low <= pitch <= self.high


def oud_range(tuning: Tuning) -> Range:
    return Range(min(tuning.courses), tuning.courses[0] + max_position(1))


def best_shift(pitches: tuple[int, ...], span: Range) -> int:
    """The shift in steps that leaves the fewest notes outside `span`; ties keep the first.

    A shift other than 0 must bring back more than SHIFT_GAIN of all notes, else stray notes
    are folded one by one and the piece stays where it is.
    """

    def out(shift: int) -> int:
        return sum(not span.contains(p + shift) for p in pitches)

    worth = [k for k in SHIFTS if out(0) - out(k) > SHIFT_GAIN * len(pitches)]
    return min(worth or [0], key=out)


def fold(pitch: int, span: Range) -> int:
    """`pitch` moved by whole octaves into `span` (the span is wider than an octave)."""
    if pitch < span.low:
        return pitch + _octaves_up(span.low - pitch)
    if pitch > span.high:
        return pitch - _octaves_up(pitch - span.high)
    return pitch


def _octaves_up(gap: int) -> int:
    """Steps of the smallest whole number of octaves that is at least `gap`."""
    return -(-gap // STEPS_PER_OCTAVE) * STEPS_PER_OCTAVE
