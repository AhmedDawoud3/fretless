"""Oud chord voicings: 2 to 4 notes on adjacent courses, one risha strum."""

from dataclasses import dataclass
from itertools import product

from fretless.chord import Chord, chord_pitch_classes, essential_roles
from fretless.fingering import is_fingerable, stopped_span
from fretless.neck import Location, max_position, pitch_at
from fretless.pitch import STEPS_PER_OCTAVE
from fretless.tuning import Tuning

NECK_LIMIT = 14  # prefer the neck proper: no position above this on any course
SIZES = (2, 3, 4)


@dataclass(frozen=True)
class Voicing:
    locations: tuple[Location, ...]  # lowest course (highest number) first


def bass_is_root(tuning: Tuning, chord: Chord, voicing: Voicing) -> bool:
    lowest = min(pitch_at(tuning, loc) for loc in voicing.locations)
    return lowest % STEPS_PER_OCTAVE == chord.root


def open_courses(voicing: Voicing) -> int:
    return sum(1 for loc in voicing.locations if loc.position == 0)


def score(tuning: Tuning, chord: Chord, voicing: Voicing) -> int:
    """Lower is better.

    ponytail: hand-tuned weights, no per-player hand model; replace with a learned or
    per-player cost (finger stretch, hand position changes) if the ranking proves too crude.
    """
    notes = len(voicing.locations)
    highest = max(loc.position for loc in voicing.locations)
    return (
        (0 if bass_is_root(tuning, chord, voicing) else 1000)  # root in the bass dominates
        - 100 * notes  # a fuller strum beats a thinner one
        + 5 * highest  # stay near the nut
        - 3 * open_courses(voicing)  # open courses are free and ring
        + stopped_span(voicing.locations)  # a tighter hand is easier
    )


def _candidates(tuning: Tuning, course: int, classes: frozenset[int]) -> tuple[Location, ...]:
    top = min(max_position(course), NECK_LIMIT)
    found = (Location(course, position) for position in range(top + 1))
    return tuple(loc for loc in found if pitch_at(tuning, loc) % STEPS_PER_OCTAVE in classes)


def _has_required_roles(tuning: Tuning, chord: Chord, locations: tuple[Location, ...]) -> bool:
    role_of = {
        pc: tone.role
        for pc, tone in zip(chord_pitch_classes(chord), chord.quality.tones, strict=True)
    }
    heard = {role_of[pitch_at(tuning, loc) % STEPS_PER_OCTAVE] for loc in locations}
    needed = essential_roles(chord.quality)
    return (needed if len(locations) >= 3 else needed - {"seventh"}) <= heard


def _is_valid(tuning: Tuning, chord: Chord, locations: tuple[Location, ...]) -> bool:
    stopped = tuple(loc for loc in locations if loc.position > 0)
    return is_fingerable(stopped) and _has_required_roles(tuning, chord, locations)


def _windows(tuning: Tuning, classes: frozenset[int]) -> list[list[tuple[Location, ...]]]:
    """Candidate lists for every run of adjacent courses, lowest course first."""
    courses = range(len(tuning.courses), 0, -1)
    per_course = {c: _candidates(tuning, c, classes) for c in courses}
    runs = (list(courses)[i : i + n] for n in SIZES for i in range(len(courses) - n + 1))
    return [[per_course[c] for c in run] for run in runs]


def voicings(tuning: Tuning, chord: Chord, limit: int = 8) -> tuple[Voicing, ...]:
    """The best playable voicings of `chord` on `tuning`, best first."""
    classes = frozenset(chord_pitch_classes(chord))
    found = (
        Voicing(combo)
        for window in _windows(tuning, classes)
        for combo in product(*window)
        if _is_valid(tuning, chord, combo)
    )
    ranked = sorted(
        found,
        key=lambda v: (
            score(tuning, chord, v),
            tuple((loc.course, loc.position) for loc in v.locations),
        ),
    )
    return tuple(ranked[:limit])
