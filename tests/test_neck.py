from hypothesis import given
from hypothesis import strategies as st

from fretless.neck import (
    Location,
    all_locations,
    locations_of,
    lowest_location,
    max_position,
    pitch_at,
)
from fretless.tuning import TUNINGS, Tuning

tunings = st.sampled_from(list(TUNINGS.values()))


def test_tunings_are_listed_high_to_low() -> None:
    assert TUNINGS["cc"].courses == (96, 86, 76, 66, 58, 48)
    assert TUNINGS["ff"].courses == (106, 96, 86, 76, 66, 58)
    assert TUNINGS["cc"].label == "C–C"  # noqa: RUF001 (en dash in label)
    assert TUNINGS["ff"].label == "F–F"  # noqa: RUF001 (en dash in label)


def test_max_position_octave_on_course_one_fifth_elsewhere() -> None:
    assert [max_position(c) for c in range(1, 7)] == [24, 14, 14, 14, 14, 14]


def test_pitch_at_adds_position_to_open_pitch() -> None:
    assert pitch_at(TUNINGS["cc"], Location(course=6, position=0)) == 48
    assert pitch_at(TUNINGS["cc"], Location(course=1, position=24)) == 120


def test_all_locations_count() -> None:
    assert len(all_locations(TUNINGS["cc"])) == 5 * 15 + 25


@given(tunings)
def test_every_location_is_within_range(tuning: Tuning) -> None:
    for loc in all_locations(tuning):
        assert 0 <= loc.position <= max_position(loc.course)
        assert 1 <= loc.course <= len(tuning.courses)


def test_locations_of_filters_by_pitch_class() -> None:
    found = locations_of(TUNINGS["cc"], frozenset({0}))
    assert Location(1, 0) in found
    assert all(pitch_at(TUNINGS["cc"], loc) % 24 == 0 for loc in found)
    assert len(found) == len(
        [loc for loc in all_locations(TUNINGS["cc"]) if pitch_at(TUNINGS["cc"], loc) % 24 == 0]
    )


@given(tunings, st.integers(min_value=0, max_value=200))
def test_lowest_location_sounds_the_pitch(tuning: Tuning, pitch: int) -> None:
    loc = lowest_location(tuning, pitch)
    if loc is not None:
        assert pitch_at(tuning, loc) == pitch


def test_lowest_location_prefers_smallest_position() -> None:
    cc, ff = TUNINGS["cc"], TUNINGS["ff"]
    assert lowest_location(cc, 96) == Location(1, 0)  # open C4, not course 2 at 10
    assert lowest_location(cc, 100) == Location(1, 4)  # not course 2 at 14
    assert lowest_location(cc, 106) == Location(1, 10)
    assert lowest_location(cc, 48) == Location(6, 0)
    assert lowest_location(ff, 90) == Location(3, 4)  # not course 4 at 14


def test_lowest_location_none_off_the_neck() -> None:
    assert lowest_location(TUNINGS["cc"], 47) is None
    assert lowest_location(TUNINGS["cc"], 121) is None
