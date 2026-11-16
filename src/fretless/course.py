"""Guided guitar-to-oud curriculum: seven progressive lessons adapted to an oud tuning."""

from dataclasses import dataclass

from fretless.chord import QUALITIES, Chord
from fretless.maqam import MAQAMAT, ascending_octave
from fretless.neck import Location, lowest_location, pitch_at
from fretless.tab.oud_render import ascii_name
from fretless.tuning import Tuning
from fretless.voicing import voicings


@dataclass(frozen=True)
class LessonStep:
    course: int
    position: int
    pitch: int
    label: str


@dataclass(frozen=True)
class Lesson:
    id: str
    number: int
    title: str
    summary: str
    guitarist_tip: str
    steps: tuple[LessonStep, ...]


def _step_at(tuning: Tuning, course: int, position: int) -> LessonStep:
    pitch = pitch_at(tuning, Location(course, position))
    return LessonStep(course, position, pitch, ascii_name(pitch))


def _step_pitch(tuning: Tuning, pitch: int) -> LessonStep:
    loc = lowest_location(tuning, pitch)
    if loc is None:
        raise ValueError(f"pitch {pitch} does not fit on tuning {tuning.id}")
    return LessonStep(loc.course, loc.position, pitch, ascii_name(pitch))


def _maqam_steps(tuning: Tuning, maqam_id: str, root: int) -> tuple[LessonStep, ...]:
    pitches = ascending_octave(MAQAMAT[maqam_id], root, min(tuning.courses))
    return tuple(_step_pitch(tuning, pitch) for pitch in pitches)


def _cadence_steps(tuning: Tuning) -> tuple[LessonStep, ...]:
    cm = voicings(tuning, Chord(0, QUALITIES["min"]), limit=1)[0]
    g = voicings(tuning, Chord(14, QUALITIES["maj"]), limit=1)[0]
    return tuple(
        _step_at(tuning, loc.course, loc.position) for loc in (*cm.locations, *g.locations)
    )


def lessons_for_tuning(tuning: Tuning) -> tuple[Lesson, ...]:
    """Return the seven progressive lessons mapped onto `tuning`."""
    return (
        Lesson(
            "open-courses",
            1,
            "1. Meet the six courses",
            "Pluck the six open courses from lowest (course 6) to highest (course 1).",
            "Unlike guitar (which drops to a major third between G and B), the oud tunes "
            "its upper five courses in pure fourths so finger shapes stay uniform.",
            tuple(_step_at(tuning, course, 0) for course in range(len(tuning.courses), 0, -1)),
        ),
        Lesson(
            "first-position",
            2,
            "2. First position in fourths",
            "Walk natural notes in first position across courses 4, 3, and 2 without shifting.",
            "Virtual frets 0, 2, and 3 on adjacent courses give you the same box pattern "
            "you know from the guitar's lower four strings.",
            tuple(_step_at(tuning, course, pos) for course in (4, 3, 2) for pos in (0, 4, 6)),
        ),
        Lesson(
            "quarter-tone",
            3,
            "3. Your first quarter tone",
            "Compare a semitone (fret 1), a half-flat quarter tone (fret 1.5), and a whole tone.",
            "Place your finger right between guitar frets 1 and 2 on course 2—neither flat "
            "nor natural—to hear the neutral interval at the heart of maqam.",
            tuple(_step_at(tuning, 2, pos) for pos in (0, 2, 3, 4)),
        ),
        Lesson(
            "maqam-rast",
            4,
            "4. Maqam Rast on C",
            "Play an ascending octave of Maqam Rast on C, hearing the half-flat 3rd and 7th.",
            "Rast feels like a major scale until degrees 3 (Ed) and 7 (Bd) pull inward by a "
            "quarter tone—give them a gentle touch without sliding sharp.",
            _maqam_steps(tuning, "rast", 0),
        ),
        Lesson(
            "maqam-bayati",
            5,
            "5. Maqam Bayati on D",
            "Play an ascending octave of Maqam Bayati on D, opening on a half-flat 2nd.",
            "Think of D natural minor with the second note (Ed) lowered a quarter tone; "
            "most Arabic folk and classical songs begin right here.",
            _maqam_steps(tuning, "bayati", 4),
        ),
        Lesson(
            "maqam-hijaz",
            6,
            "6. Maqam Hijaz on D",
            "Play Maqam Hijaz on D and feel the wide 1.5-tone leap from Eb to F#.",
            "This matches the Spanish Phrygian dominant mode you may already know on guitar—no "
            "quarter tones needed, just clean intonation across the 3-fret leap.",
            _maqam_steps(tuning, "hijaz", 4),
        ),
        Lesson(
            "oud-cadence",
            7,
            "7. Chords on a fretless neck",
            "Arpeggiate a playable C minor voicing followed by G major, lowest course first.",
            "Oud players favour 2- to 4-note voicings with open courses rather than full "
            "six-string guitar barres, keeping intonation ringing and relaxed.",
            _cadence_steps(tuning),
        ),
    )
