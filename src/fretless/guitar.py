"""The guitar: tunings and the pitches a fretted shape sounds."""

from dataclasses import dataclass

from fretless.pitch import LETTER_BY_NAME, NoteName, name_to_pitch


@dataclass(frozen=True)
class GuitarTuning:
    id: str
    label: str
    strings: tuple[int, ...]  # open pitch per string, string 1 (highest) first


def _pitch(note: str) -> int:
    """Parse "E2", "Eb2", "F#3" into a pitch (a flat or sharp is one semitone, 2 steps)."""
    letter, octave = LETTER_BY_NAME[note[0]], int(note[-1])
    alter = {"b": -2, "#": 2}[note[1]] if len(note) == 3 else 0
    return name_to_pitch(NoteName(letter, alter, octave))


def _from_low(id: str, label: str, low_to_high: str) -> GuitarTuning:
    return GuitarTuning(id, label, tuple(_pitch(n) for n in reversed(low_to_high.split())))


GUITAR_TUNINGS: dict[str, GuitarTuning] = {
    t.id: t
    for t in (
        _from_low("standard", "Standard", "E2 A2 D3 G3 B3 E4"),
        _from_low("drop_d", "Drop D", "D2 A2 D3 G3 B3 E4"),
        _from_low("half_down", "Half step down", "Eb2 Ab2 Db3 Gb3 Bb3 Eb4"),
        _from_low("dadgad", "DADGAD", "D2 A2 D3 G3 A3 D4"),
        _from_low("open_g", "Open G", "D2 G2 D3 G3 B3 D4"),
        _from_low("open_d", "Open D", "D2 A2 D3 F#3 A3 D4"),
    )
}


def fretted_pitch(open_pitch: int, capo: int, fret: int) -> int:
    """Pitch of a string pressed at `fret` (counted from the capo); one fret is two steps."""
    return open_pitch + 2 * (capo + fret)


def shape_pitches(
    strings: tuple[int, ...], capo: int, frets: tuple[int | None, ...]
) -> tuple[int, ...]:
    """Sounding pitches of the non-muted strings, lowest first.

    `frets` runs like `strings` (string 1 first); None is muted. Fret numbers count from the
    capo, as in chord charts and tab; one fret is two steps.
    """
    return tuple(
        fretted_pitch(open_pitch, capo, fret)
        for open_pitch, fret in zip(strings, frets, strict=True)
        if fret is not None
    )[::-1]
