"""Name the chords a set of sounding pitches could be."""

from dataclasses import dataclass

from fretless.chord import QUALITIES, Chord, chord_pitch_classes, essential_roles
from fretless.pitch import STEPS_PER_OCTAVE


@dataclass(frozen=True)
class ChordMatch:
    chord: Chord
    bass: int  # pitch class of the lowest note
    missing: tuple[str, ...]  # chord-tone roles the shape does not sound


def _match(chord: Chord, classes: frozenset[int], bass: int) -> ChordMatch | None:
    """The match if `classes` is a valid, reduced voicing of `chord`, else None."""
    tones = chord.quality.tones
    chord_classes = chord_pitch_classes(chord)
    if chord.root not in classes or not classes <= set(chord_classes):
        return None
    heard = {t.role for t, pc in zip(tones, chord_classes, strict=True) if pc in classes}
    if not essential_roles(chord.quality) <= heard:
        return None
    return ChordMatch(chord, bass, tuple(t.role for t in tones if t.role not in heard))


def _rank(match: ChordMatch, classes: frozenset[int]) -> tuple[bool, bool, int, int]:
    """Lower is better: exact set, then bass is root, then fewer tones, then quality order."""
    quality = match.chord.quality
    exact = set(chord_pitch_classes(match.chord)) == classes
    return (
        not exact,
        match.bass != match.chord.root,
        len(quality.tones),
        list(QUALITIES).index(quality.id),
    )


def identify(pitches: tuple[int, ...]) -> tuple[ChordMatch, ...]:
    """Every chord the shape could be, best first. Empty for under 2 notes or quarter tones."""
    classes = frozenset(p % STEPS_PER_OCTAVE for p in pitches)
    if len(classes) < 2 or any(pc % 2 for pc in classes):
        return ()
    bass = min(pitches) % STEPS_PER_OCTAVE
    found = (
        _match(Chord(root, quality), classes, bass)
        for root in range(0, STEPS_PER_OCTAVE, 2)
        for quality in QUALITIES.values()
    )
    return tuple(sorted((m for m in found if m), key=lambda m: _rank(m, classes)))
