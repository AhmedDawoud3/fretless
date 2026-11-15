"""Playback sequences: a pitch list with its spelling and where to play each note."""

from fretless.api.names import name_out
from fretless.api.schemas import LocationOut, PlaybackOut
from fretless.neck import lowest_location
from fretless.pitch import Letter, spell
from fretless.tuning import Tuning


def playback_out(
    tuning: Tuning, pitches: tuple[int, ...], spellings: list[tuple[Letter, int]]
) -> list[PlaybackOut]:
    """One entry per pitch, spelled as given and placed at its lowest location (or None)."""
    out = []
    for pitch, (letter, alter) in zip(pitches, spellings, strict=True):
        found = lowest_location(tuning, pitch)
        out.append(
            PlaybackOut(
                pitch=pitch,
                name=name_out(spell(pitch, letter, alter)),
                location=None
                if found is None
                else LocationOut(course=found.course, position=found.position),
            )
        )
    return out
