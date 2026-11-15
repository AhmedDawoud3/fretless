import pytest
from hypothesis import given
from hypothesis import strategies as st

from fretless.maqam import MAQAMAT, Maqam, ascending_octave, scale_pitch_classes, spell_scale
from fretless.pitch import LETTER_STEPS

roots = st.integers(min_value=0, max_value=23)
maqamat = st.sampled_from(list(MAQAMAT.values()))


def test_eight_maqamat_in_order() -> None:
    assert list(MAQAMAT) == [
        "rast", "bayati", "hijaz", "nahawand", "kurd", "saba", "ajam", "sikah",
    ]  # fmt: skip
    assert MAQAMAT["rast"].intervals == (4, 3, 3, 4, 4, 3, 3)
    assert MAQAMAT["sikah"].default_root == 7
    assert MAQAMAT["ajam"].default_root == 20
    assert MAQAMAT["hijaz"].arabic_name == "حجاز"


def test_intervals_must_sum_to_an_octave() -> None:
    with pytest.raises(ValueError, match="24"):
        Maqam("x", "X", "x", (4, 4, 4, 4, 4, 4, 4), 0, "bad")


def test_every_maqam_has_a_description() -> None:
    assert all(m.description for m in MAQAMAT.values())


def test_scale_pitch_classes_wrap_around_the_octave() -> None:
    assert scale_pitch_classes(MAQAMAT["rast"], 0) == (0, 4, 7, 10, 14, 18, 21)
    assert scale_pitch_classes(MAQAMAT["rast"], 20) == (20, 0, 3, 6, 10, 14, 17)


@pytest.mark.parametrize(
    ("maqam_id", "root", "expected"),
    [
        ("rast", 0, [("C", 0), ("D", 0), ("E", -1), ("F", 0), ("G", 0), ("A", 0), ("B", -1)]),
        ("bayati", 4, [("D", 0), ("E", -1), ("F", 0), ("G", 0), ("A", 0), ("B", -2), ("C", 0)]),
        ("hijaz", 4, [("D", 0), ("E", -2), ("F", 2), ("G", 0), ("A", 0), ("B", -2), ("C", 0)]),
        ("sikah", 7, [("E", -1), ("F", 0), ("G", 0), ("A", 0), ("B", -1), ("C", 0), ("D", 0)]),
    ],
)
def test_spell_scale_examples(maqam_id: str, root: int, expected: list[tuple[str, int]]) -> None:
    assert spell_scale(MAQAMAT[maqam_id], root) == tuple(expected)


@given(maqamat, roots)
def test_spelling_uses_seven_letters_and_maps_back(maqam: Maqam, root: int) -> None:
    spelled = spell_scale(maqam, root)
    assert len({letter for letter, _ in spelled}) == 7
    for (letter, alter), pc in zip(spelled, scale_pitch_classes(maqam, root), strict=True):
        assert (LETTER_STEPS[letter] + alter) % 24 == pc
        assert abs(alter) <= 4


def test_ascending_octave_starts_at_first_root_at_or_above_lowest() -> None:
    assert ascending_octave(MAQAMAT["rast"], 0, 48) == (48, 52, 55, 58, 62, 66, 69, 72)
    assert ascending_octave(MAQAMAT["rast"], 0, 49)[0] == 72
    assert ascending_octave(MAQAMAT["bayati"], 4, 48)[0] == 52
    assert ascending_octave(MAQAMAT["bayati"], 4, 52)[0] == 52
