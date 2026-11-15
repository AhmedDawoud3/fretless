"""The playable placements of one event, cheapest first, thinning the chord only if it must."""

from dataclasses import dataclass
from functools import cache
from itertools import chain

from fretless.tab.convert_model import PlacedNote
from fretless.tab.costs import local_cost
from fretless.tab.placement import placements
from fretless.tab.reduce import octave_variants, rungs
from fretless.tab.transpose import Range
from fretless.tuning import Tuning

MAX_OPTIONS = 6  # candidates kept per event for the path search


@dataclass(frozen=True)
class Option:
    notes: tuple[PlacedNote, ...]  # ordered by course
    cost: int


def _found(tuning: Tuning, sets: tuple[tuple[int, ...], ...]) -> tuple[Option, ...]:
    return tuple(
        Option(notes, local_cost(notes))
        for notes in chain.from_iterable(placements(tuning, s) for s in sets)
    )


def _rung_options(tuning: Tuning, span: Range, rung: tuple[tuple[int, ...], ...]) -> list[Option]:
    """Placements of any set in the rung as written, else with one inner note moved an octave."""
    as_written = _found(tuning, rung)
    if as_written:
        return list(as_written)
    return list(_found(tuning, tuple(v for s in rung for v in octave_variants(s, span))))


@cache
def options(tuning: Tuning, span: Range, pitches: tuple[int, ...]) -> tuple[Option, ...]:
    """Placements for the first rung of `rungs(pitches)` that has any, at most MAX_OPTIONS."""
    for rung in rungs(pitches):
        found = _rung_options(tuning, span, rung)
        if found:
            ranked = sorted(
                found,
                key=lambda o: (o.cost, tuple((n.course, n.position) for n in o.notes)),
            )
            return tuple(dict.fromkeys(ranked))[:MAX_OPTIONS]
    return ()
