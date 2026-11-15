"""Pure functions turning guitar tunings and identified shapes into response schemas."""

from fretless.api.chord_mappers import chord_name_out
from fretless.api.chord_schemas import SpellingOut
from fretless.api.guitar_schemas import (
    GuitarNoteOut,
    GuitarStringOut,
    GuitarTuningOut,
    IdentifyOut,
    MatchOut,
)
from fretless.api.names import name_out
from fretless.chord import chord_pitch_classes, spell_chord
from fretless.guitar import GuitarTuning, fretted_pitch, shape_pitches
from fretless.identify import ChordMatch, identify
from fretless.pitch import default_name


def guitar_tuning_out(tuning: GuitarTuning) -> GuitarTuningOut:
    return GuitarTuningOut(
        id=tuning.id,
        label=tuning.label,
        strings=[
            GuitarStringOut(string=i, pitch=pitch, name=name_out(default_name(pitch)))
            for i, pitch in enumerate(tuning.strings, start=1)
        ],
    )


def _match_out(match: ChordMatch) -> MatchOut:
    chord = match.chord
    # The bass is always a chord tone, so it takes the chord's own spelling.
    bass_letter, bass_alter = dict(
        zip(chord_pitch_classes(chord), spell_chord(chord), strict=True)
    )[match.bass]
    return MatchOut(
        root=chord.root,
        quality_id=chord.quality.id,
        symbol=chord.quality.symbol,
        name=chord_name_out(chord),
        bass=SpellingOut(letter=bass_letter, alter=bass_alter),
        missing=list(match.missing),
    )


def notes_out(
    strings: tuple[int, ...], capo: int, frets: tuple[int | None, ...]
) -> list[GuitarNoteOut]:
    """The sounding strings, string 1 first; `fret` is as charted, `pitch` includes the capo."""
    out = []
    for string, (open_pitch, fret) in enumerate(zip(strings, frets, strict=True), start=1):
        if fret is not None:
            pitch = fretted_pitch(open_pitch, capo, fret)
            out.append(
                GuitarNoteOut(
                    string=string, fret=fret, pitch=pitch, name=name_out(default_name(pitch))
                )
            )
    return out


def identify_out(strings: tuple[int, ...], capo: int, frets: tuple[int | None, ...]) -> IdentifyOut:
    matches = identify(shape_pitches(strings, capo, frets))
    return IdentifyOut(
        notes=notes_out(strings, capo, frets), matches=[_match_out(m) for m in matches]
    )
