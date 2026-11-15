"""Pure functions turning chords, voicings and neck locations into response schemas."""

from fretless.api.chord_schemas import (
    ChordInfoOut,
    ChordOut,
    ChordToneOut,
    QualityOut,
    QualityToneOut,
    RoleLocationOut,
    SpellingOut,
    VoicingOut,
)
from fretless.api.names import name_out
from fretless.api.playback import playback_out
from fretless.chord import (
    Chord,
    ChordQuality,
    arpeggio_pitches,
    chord_pitch_classes,
    spell_chord,
)
from fretless.fingering import stopped_span
from fretless.neck import Location, locations_of, pitch_at
from fretless.pitch import STEPS_PER_OCTAVE, spell
from fretless.tuning import Tuning
from fretless.voicing import Voicing, bass_is_root, open_courses, voicings


def quality_out(quality: ChordQuality) -> QualityOut:
    return QualityOut(
        id=quality.id,
        symbol=quality.symbol,
        name=quality.name,
        tones=[QualityToneOut(semitones=t.semitones, role=t.role) for t in quality.tones],
    )


def chord_name_out(chord: Chord) -> SpellingOut:
    letter, alter = spell_chord(chord)[0]
    return SpellingOut(letter=letter, alter=alter)


def _chord_info(chord: Chord) -> ChordInfoOut:
    return ChordInfoOut(
        root=chord.root,
        quality_id=chord.quality.id,
        symbol=chord.quality.symbol,
        name=chord_name_out(chord),
        tones=[
            ChordToneOut(pitch_class=pc, letter=letter, alter=alter, role=tone.role)
            for pc, (letter, alter), tone in zip(
                chord_pitch_classes(chord), spell_chord(chord), chord.quality.tones, strict=True
            )
        ],
    )


def _role_location(tuning: Tuning, chord: Chord, location: Location) -> RoleLocationOut:
    pitch = pitch_at(tuning, location)
    index = chord_pitch_classes(chord).index(pitch % STEPS_PER_OCTAVE)
    return RoleLocationOut(
        course=location.course,
        position=location.position,
        pitch=pitch,
        name=name_out(spell(pitch, *spell_chord(chord)[index])),
        role=chord.quality.tones[index].role,
    )


def _voicing_out(tuning: Tuning, chord: Chord, voicing: Voicing) -> VoicingOut:
    return VoicingOut(
        locations=[_role_location(tuning, chord, loc) for loc in voicing.locations],
        bass_is_root=bass_is_root(tuning, chord, voicing),
        span=stopped_span(voicing.locations),
        open_courses=open_courses(voicing),
    )


def chord_out(chord: Chord, tuning: Tuning) -> ChordOut:
    classes = chord_pitch_classes(chord)
    spelling_of = dict(zip(classes, spell_chord(chord), strict=True))
    pitches = arpeggio_pitches(chord, min(tuning.courses))
    return ChordOut(
        chord=_chord_info(chord),
        locations=[
            _role_location(tuning, chord, loc) for loc in locations_of(tuning, frozenset(classes))
        ],
        voicings=[_voicing_out(tuning, chord, v) for v in voicings(tuning, chord)],
        arpeggio=playback_out(
            tuning, pitches, [spelling_of[p % STEPS_PER_OCTAVE] for p in pitches]
        ),
    )
