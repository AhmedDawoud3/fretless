"""Pure functions turning domain objects into response schemas."""

from fretless.api.names import name_out
from fretless.api.playback import playback_out
from fretless.api.schemas import (
    CourseOut,
    DegreeOut,
    MaqamOut,
    NeckLocationOut,
    NeckOut,
    PlaybackOut,
    ScaleLocationOut,
    ScaleOut,
    TuningOut,
)
from fretless.maqam import Maqam, ascending_octave, scale_pitch_classes, spell_scale
from fretless.neck import (
    all_locations,
    locations_of,
    max_position,
    pitch_at,
)
from fretless.pitch import Letter, default_name, spell
from fretless.tuning import Tuning

type Spelling = tuple[tuple[Letter, int], ...]


def tuning_out(tuning: Tuning) -> TuningOut:
    return TuningOut(id=tuning.id, label=tuning.label)


def maqam_out(maqam: Maqam) -> MaqamOut:
    return MaqamOut(
        id=maqam.id,
        name=maqam.name,
        arabic_name=maqam.arabic_name,
        intervals=list(maqam.intervals),
        default_root=maqam.default_root,
        description=maqam.description,
    )


def neck_out(tuning: Tuning) -> NeckOut:
    return NeckOut(
        tuning=tuning_out(tuning),
        courses=[
            CourseOut(course=i, open_pitch=pitch, max_position=max_position(i))
            for i, pitch in enumerate(tuning.courses, start=1)
        ],
        locations=[
            NeckLocationOut(
                course=loc.course,
                position=loc.position,
                pitch=pitch_at(tuning, loc),
                name=name_out(default_name(pitch_at(tuning, loc))),
            )
            for loc in all_locations(tuning)
        ],
    )


def _degrees_out(classes: tuple[int, ...], spelling: Spelling) -> list[DegreeOut]:
    return [
        DegreeOut(degree=i + 1, pitch_class=pc, letter=letter, alter=alter)
        for i, (pc, (letter, alter)) in enumerate(zip(classes, spelling, strict=True))
    ]


def _scale_locations_out(
    tuning: Tuning, classes: tuple[int, ...], spelling: Spelling
) -> list[ScaleLocationOut]:
    degree_of = {pc: i for i, pc in enumerate(classes)}
    out = []
    for loc in locations_of(tuning, frozenset(classes)):
        pitch = pitch_at(tuning, loc)
        index = degree_of[pitch % 24]
        out.append(
            ScaleLocationOut(
                course=loc.course,
                position=loc.position,
                pitch=pitch,
                degree=index + 1,
                name=name_out(spell(pitch, *spelling[index])),
            )
        )
    return out


def _playback_out(maqam: Maqam, root: int, tuning: Tuning, spelling: Spelling) -> list[PlaybackOut]:
    pitches = ascending_octave(maqam, root, min(tuning.courses))
    return playback_out(tuning, pitches, [spelling[i % 7] for i in range(len(pitches))])


def scale_out(maqam: Maqam, root: int, tuning: Tuning) -> ScaleOut:
    classes = scale_pitch_classes(maqam, root)
    spelling = spell_scale(maqam, root)
    return ScaleOut(
        maqam=maqam_out(maqam),
        root=root,
        degrees=_degrees_out(classes, spelling),
        locations=_scale_locations_out(tuning, classes, spelling),
        playback=_playback_out(maqam, root, tuning, spelling),
    )
