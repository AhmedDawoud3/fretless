"""Fit a piece into the oud's range: one octave shift for the whole piece, then per note."""

from dataclasses import dataclass

from fretless.neck import max_position
from fretless.pitch import STEPS_PER_OCTAVE
from fretless.tuning import Tuning

# Whole-piece shifts in steps, in order of preference when notes-out ties.
SHIFTS = (0, -STEPS_PER_OCTAVE, STEPS_PER_OCTAVE, 2 * STEPS_PER_OCTAVE)


@dataclass(frozen=True)
class Range:
    low: int  # lowest open course
    high: int  # course 1 at its highest position

    def contains(self, pitch: int) -> bool:
        return self.low <= pitch <= self.high


def oud_range(tuning: Tuning) -> Range:
    return Range(min(tuning.courses), tuning.courses[0] + max_position(1))


def best_shift(pitches: tuple[int, ...], span: Range) -> int:
    """The shift in steps that leaves the fewest notes outside `span`; ties keep the first."""
    return min(SHIFTS, key=lambda k: sum(not span.contains(p + k) for p in pitches))


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
