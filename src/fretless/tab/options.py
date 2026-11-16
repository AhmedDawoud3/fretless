"""The playable placements of one event, cheapest first, thinning the chord only if it must."""

from dataclasses import dataclass
from functools import cache
from itertools import chain

from fretless.tab.convert_model import PlacedNote
from fretless.tab.costs import local_cost
from fretless.tab.placement import placements
from fretless.tab.reduce import Rung, octave_variants, rungs
from fretless.tab.transpose import Range
from fretless.tuning import Tuning

MAX_OPTIONS = 6  # candidates kept per event for the path search
HIGH_POSITION = 10  # steps; a stopped note above this (virtual fret 5) is a stretch


@dataclass(frozen=True)
class Option:
    notes: tuple[PlacedNote, ...]  # ordered by course
    cost: int


def _found(tuning: Tuning, sets: tuple[tuple[int, ...], ...]) -> tuple[Option, ...]:
    return tuple(
        Option(notes, local_cost(notes))
        for notes in chain.from_iterable(placements(tuning, s) for s in sets)
    )


def _rung_options(tuning: Tuning, span: Range, rung: Rung) -> list[Option]:
    """Placements of any set in the rung as written, else with one inner note moved an octave."""
    as_written = _found(tuning, rung)
    if as_written:
        return list(as_written)
    return list(_found(tuning, tuple(v for s in rung for v in octave_variants(s, span))))


def _ranked(found: list[Option]) -> tuple[Option, ...]:
    ranked = sorted(found, key=lambda o: (o.cost, tuple((n.course, n.position) for n in o.notes)))
    return tuple(dict.fromkeys(ranked))[:MAX_OPTIONS]


def _hard(option: Option) -> bool:
    return any(n.position > HIGH_POSITION for n in option.notes)


def _smaller_easy(
    tuning: Tuning, span: Range, rest: tuple[Rung, ...], size: int
) -> list[Option] | None:
    """Options with no stopped position above HIGH_POSITION from the first rung one note smaller.

    ponytail: hand-tuned threshold (10 steps, virtual fret 5) standing in for a hand model.
    Ceiling: it only looks one note down, and treats every position under it as equally easy.
    Upgrade path: a real hand model that scores reach and shift.
    """
    for rung in rest:
        if len(rung[0]) == size - 1:
            easy = [o for o in _rung_options(tuning, span, rung) if not _hard(o)]
            if easy:
                return easy
    return None


@cache
def options(tuning: Tuning, span: Range, pitches: tuple[int, ...]) -> tuple[Option, ...]:
    """Placements for the first rung of `rungs(pitches)` that has any, at most MAX_OPTIONS.

    Rungs go largest first, so size wins over cost; but when every placement of a rung needs
    a position above HIGH_POSITION, an easy placement one note smaller wins instead.
    """
    ladder = rungs(pitches)
    for number, rung in enumerate(ladder):
        found = _rung_options(tuning, span, rung)
        if found:
            if all(_hard(o) for o in found):
                found = _smaller_easy(tuning, span, ladder[number + 1 :], len(rung[0])) or found
            return _ranked(found)
    return ()
