import pytest
from hypothesis import given
from hypothesis import strategies as st

from fretless.pitch import NoteName, default_name, name_to_pitch, spell


@given(st.integers(min_value=0, max_value=240))
def test_name_round_trips_through_pitch(pitch: int) -> None:
    assert name_to_pitch(default_name(pitch)) == pitch


@pytest.mark.parametrize(
    ("pitch", "expected"),
    [
        (0, NoteName("C", 0, 0)),
        (48, NoteName("C", 0, 2)),
        (66, NoteName("A", 0, 2)),
        (96, NoteName("C", 0, 4)),
        (97, NoteName("C", 1, 4)),
        (103, NoteName("E", -1, 4)),
        (116, NoteName("B", -2, 4)),
        (119, NoteName("B", 1, 4)),
    ],
)
def test_default_name_spelling(pitch: int, expected: NoteName) -> None:
    assert default_name(pitch) == expected


def test_spell_crossing_octave_boundary() -> None:
    # B with a positive alter sounds in the next octave's C range but keeps its letter octave.
    assert spell(96, "B", 2) == NoteName("B", 2, 3)
    assert spell(95, "C", -1) == NoteName("C", -1, 4)
    assert name_to_pitch(spell(96, "B", 2)) == 96
