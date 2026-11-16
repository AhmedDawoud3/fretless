"""Ways to thin out a chord that cannot be played whole, best first. Pure pitch arithmetic."""

from itertools import combinations

from fretless.pitch import STEPS_PER_OCTAVE
from fretless.tab.transpose import Range

MAX_NOTES = 4  # an oud chord is a 2 to 4 note shape, as in voicing.py

type Rung = tuple[tuple[int, ...], ...]  # alternative pitch sets of one preference level


def _desc(pitches: tuple[int, ...] | list[int]) -> tuple[int, ...]:
    return tuple(sorted(set(pitches), reverse=True))


def _most_classes(sets: Rung) -> Rung:
    """The sets with the most distinct pitch classes: root, third, fifth beat root, root, fifth."""

    def classes(pitches: tuple[int, ...]) -> int:
        return len({p % STEPS_PER_OCTAVE for p in pitches})

    best = max(classes(s) for s in sets)
    return tuple(s for s in sets if classes(s) == best)


def _subsets(pitches: tuple[int, ...], size: int, with_bass: bool) -> Rung:
    """Subsets of `size` notes that keep the top note (and the bass when `with_bass`)."""
    inner = pitches[1:-1]
    fixed = (pitches[0], pitches[-1]) if with_bass else (pitches[0],)
    return tuple(_desc(fixed + c) for c in combinations(inner, size - len(fixed)))


def rungs(pitches: tuple[int, ...]) -> tuple[Rung, ...]:
    """Pitch sets to try in order: the whole chord if it has at most MAX_NOTES, then fewer.

    The top note (the melody) is always kept. Subsets that keep the bass come before any
    that lose it, larger before smaller; within a size, only sets with the most distinct
    pitch classes. The last resort is the top note alone.
    """
    whole = _desc(pitches)
    count = len(whole)
    levels: list[Rung] = [(whole,)] if count <= MAX_NOTES else []
    if count > 1:
        for with_bass in (True, False):
            for size in range(min(count - 1, MAX_NOTES), 1, -1):
                levels.append(_most_classes(_subsets(whole, size, with_bass)))
        levels.append(((whole[0],),))
    return tuple(levels)


def octave_variants(pitches: tuple[int, ...], span: Range) -> tuple[tuple[int, ...], ...]:
    """Sets with one inner note moved an octave, still inside `span` and between top and bass."""
    ordered = _desc(pitches)
    found = {
        _desc([*ordered[:i], moved, *ordered[i + 1 :]])
        for i in range(1, len(ordered) - 1)
        for moved in (ordered[i] - STEPS_PER_OCTAVE, ordered[i] + STEPS_PER_OCTAVE)
        if ordered[-1] < moved < ordered[0] and span.contains(moved) and moved not in ordered
    }
    return tuple(sorted(found, reverse=True))
