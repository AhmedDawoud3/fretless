"""Ways to thin out a chord that cannot be played whole, best first. Pure pitch arithmetic."""

from itertools import combinations

from fretless.pitch import STEPS_PER_OCTAVE
from fretless.tab.transpose import Range

type Rung = tuple[tuple[int, ...], ...]  # alternative pitch sets of one preference level


def _desc(pitches: tuple[int, ...] | list[int]) -> tuple[int, ...]:
    return tuple(sorted(set(pitches), reverse=True))


def _drop_duplicate_classes(pitches: tuple[int, ...]) -> tuple[int, ...]:
    """Keep the top and bottom notes and the lowest note of every other pitch class."""
    seen: set[int] = set()
    kept = []
    for pitch in reversed(pitches):  # lowest first
        if pitch in (pitches[0], pitches[-1]) or pitch % STEPS_PER_OCTAVE not in seen:
            kept.append(pitch)
        seen.add(pitch % STEPS_PER_OCTAVE)
    return _desc(kept)


def _subsets(pitches: tuple[int, ...], size: int, with_bass: bool) -> Rung:
    """Subsets of `size` notes that keep the top note (and the bass when `with_bass`)."""
    inner = pitches[1:-1]
    fixed = (pitches[0], pitches[-1]) if with_bass else (pitches[0],)
    return tuple(_desc(fixed + c) for c in combinations(inner, size - len(fixed)))


def rungs(pitches: tuple[int, ...]) -> tuple[Rung, ...]:
    """Pitch sets to try in order: all notes, duplicate classes dropped, then fewer notes.

    The top note (the melody) is always kept. Subsets that keep the bass come before any
    that lose it; the last resort is the top note alone.
    """
    whole = _desc(pitches)
    thinner = _drop_duplicate_classes(whole)
    levels: list[Rung] = [(whole,)]
    if thinner != whole:
        levels.append((thinner,))
    top = len(thinner)
    if top > 1:
        levels += [_subsets(thinner, s, True) for s in range(top - 1, 1, -1)]
        levels += [_subsets(thinner, s, False) for s in range(top - 1, 1, -1)]
        levels.append(((thinner[0],),))
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
