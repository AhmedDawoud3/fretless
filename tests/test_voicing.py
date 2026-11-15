from hypothesis import given
from hypothesis import strategies as st

from fretless.chord import QUALITIES, Chord, ChordQuality, chord_pitch_classes, essential_roles
from fretless.fingering import is_fingerable
from fretless.neck import Location, max_position, pitch_at
from fretless.tuning import TUNINGS, Tuning
from fretless.voicing import Voicing, bass_is_root, open_courses, voicings

CC = TUNINGS["cc"]
FF = TUNINGS["ff"]
tunings = st.sampled_from(list(TUNINGS.values()))
roots = st.integers(0, 11).map(lambda n: n * 2)
qualities = st.sampled_from(list(QUALITIES.values()))


def roles_of(tuning: Tuning, chord: Chord, voicing: Voicing) -> set[str]:
    by_class = {
        pc: tone.role
        for pc, tone in zip(chord_pitch_classes(chord), chord.quality.tones, strict=True)
    }
    return {by_class[pitch_at(tuning, loc) % 24] for loc in voicing.locations}


def check_rules(tuning: Tuning, chord: Chord, voicing: Voicing) -> None:
    locs = voicing.locations
    courses = [loc.course for loc in locs]
    assert 2 <= len(locs) <= 4
    assert courses == list(range(courses[0], courses[0] - len(courses), -1))  # lowest first
    chord_classes = set(chord_pitch_classes(chord))
    assert all(pitch_at(tuning, loc) % 24 in chord_classes for loc in locs)
    needed = essential_roles(chord.quality)
    if len(locs) < 3:
        needed = needed - {"seventh"}
    assert needed <= roles_of(tuning, chord, voicing)
    assert is_fingerable(tuple(loc for loc in locs if loc.position > 0))
    assert all(loc.position <= min(max_position(loc.course), 14) for loc in locs)


@given(tunings, roots, qualities, st.integers(1, 12))
def test_every_voicing_obeys_every_rule(
    tuning: Tuning, root: int, quality: ChordQuality, limit: int
) -> None:
    chord = Chord(root, quality)
    found = voicings(tuning, chord, limit)

    assert len(found) <= limit
    assert len(set(found)) == len(found)
    for voicing in found:
        check_rules(tuning, chord, voicing)


@given(tunings, roots, st.sampled_from(["maj", "min"]))
def test_every_triad_has_a_voicing(tuning: Tuning, root: int, quality_id: str) -> None:
    assert voicings(tuning, Chord(root, QUALITIES[quality_id]))


def test_c_major_in_cc_can_use_open_g_and_c_courses() -> None:
    # CC: course 4 = A2 (66), 3 = D3 (76), 2 = G3 (86, open), 1 = C4 (96, open).
    # C3 = 72 is course 4 position 6; E3 = 80 is course 3 position 4.
    shape = Voicing((Location(4, 6), Location(3, 4), Location(2, 0), Location(1, 0)))

    assert shape in voicings(CC, Chord(0, QUALITIES["maj"]), limit=200)


def test_c_major_in_ff_can_use_open_g_and_c_courses() -> None:
    # FF: course 4 = D3 (76), 3 = G3 (86, open), 2 = C4 (96, open). E3 = 80 is course 4 position 4.
    shape = Voicing((Location(4, 4), Location(3, 0), Location(2, 0)))

    assert shape in voicings(FF, Chord(0, QUALITIES["maj"]), limit=200)


def test_a_voicing_with_the_root_in_the_bass_beats_one_without() -> None:
    chord = Chord(0, QUALITIES["maj"])
    found = voicings(CC, chord, limit=3)

    assert all(bass_is_root(CC, chord, v) for v in found)


def test_helpers_describe_a_voicing() -> None:
    shape = Voicing((Location(4, 6), Location(3, 4), Location(2, 0), Location(1, 0)))

    assert bass_is_root(CC, Chord(0, QUALITIES["maj"]), shape)
    assert not bass_is_root(CC, Chord(8, QUALITIES["maj"]), shape)
    assert open_courses(shape) == 2


def test_results_are_deterministic_and_limited() -> None:
    chord = Chord(14, QUALITIES["7"])

    assert voicings(CC, chord, 5) == voicings(CC, chord, 5)
    assert len(voicings(CC, chord, 5)) == 5
