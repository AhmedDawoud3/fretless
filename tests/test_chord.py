import pytest
from hypothesis import given
from hypothesis import strategies as st

from fretless.chord import (
    QUALITIES,
    Chord,
    ChordQuality,
    arpeggio_pitches,
    chord_pitch_classes,
    essential_roles,
    spell_chord,
)
from fretless.pitch import LETTER_STEPS

roots = st.integers(0, 11).map(lambda n: n * 2)
qualities = st.sampled_from(list(QUALITIES.values()))


def test_qualities_are_in_the_documented_order() -> None:
    assert list(QUALITIES) == [
        "maj", "min", "7", "maj7", "m7", "dim", "aug", "sus2", "sus4", "5", "6", "m6",
        "dim7", "m7b5", "add9", "9",
    ]  # fmt: skip


def test_quality_symbols() -> None:
    assert [q.symbol for q in QUALITIES.values()] == [
        "", "m", "7", "maj7", "m7", "dim", "aug", "sus2", "sus4", "5", "6", "m6",
        "dim7", "m7b5", "add9", "9",
    ]  # fmt: skip


def test_pitch_classes_follow_tone_order() -> None:
    assert chord_pitch_classes(Chord(0, QUALITIES["maj"])) == (0, 8, 14)
    assert chord_pitch_classes(Chord(20, QUALITIES["7"])) == (20, 4, 10, 16)
    assert chord_pitch_classes(Chord(0, QUALITIES["add9"])) == (0, 8, 14, 4)


def test_root_must_be_a_pitch_class() -> None:
    with pytest.raises(ValueError, match="root"):
        Chord(24, QUALITIES["maj"])
    with pytest.raises(ValueError, match="root"):
        Chord(-2, QUALITIES["maj"])


def test_spell_c_major_and_minor() -> None:
    assert spell_chord(Chord(0, QUALITIES["maj"])) == (("C", 0), ("E", 0), ("G", 0))
    assert spell_chord(Chord(0, QUALITIES["min"])) == (("C", 0), ("E", -2), ("G", 0))


def test_spell_d7() -> None:
    assert spell_chord(Chord(4, QUALITIES["7"])) == (("D", 0), ("F", 2), ("A", 0), ("C", 0))


def test_spell_e_flat_major_uses_the_default_root_spelling() -> None:
    assert spell_chord(Chord(6, QUALITIES["maj"])) == (("E", -2), ("G", 0), ("B", -2))


def test_spell_f_sharp_half_diminished() -> None:
    assert spell_chord(Chord(12, QUALITIES["m7b5"])) == (
        ("F", 2), ("A", 0), ("C", 0), ("E", 0),
    )  # fmt: skip


def test_ninth_is_spelled_as_a_second() -> None:
    assert spell_chord(Chord(0, QUALITIES["9"]))[4] == ("D", 0)


@given(roots, qualities)
def test_spelled_tones_map_back_to_pitch_classes(root: int, quality: ChordQuality) -> None:
    chord = Chord(root, quality)
    spelled = spell_chord(chord)
    for (letter, alter), pc in zip(spelled, chord_pitch_classes(chord), strict=True):
        assert (LETTER_STEPS[letter] + alter) % 24 == pc


@pytest.mark.parametrize(
    ("quality_id", "roles"),
    [
        ("maj", {"root", "third"}),
        ("7", {"root", "third", "seventh"}),
        ("sus2", {"root", "second"}),
        ("sus4", {"root", "fourth"}),
        ("5", {"root", "fifth"}),
        ("dim7", {"root", "third", "seventh"}),
        ("6", {"root", "third"}),
    ],
)
def test_essential_roles(quality_id: str, roles: set[str]) -> None:
    assert essential_roles(QUALITIES[quality_id]) == frozenset(roles)


def test_arpeggio_runs_from_the_lowest_root_to_the_octave_above() -> None:
    assert arpeggio_pitches(Chord(0, QUALITIES["maj"]), 48) == (48, 56, 62, 72)
    assert arpeggio_pitches(Chord(18, QUALITIES["min"]), 48) == (66, 72, 80, 90)


def test_arpeggio_sorts_an_extension_into_the_octave() -> None:
    # C9: C E G Bb D, the ninth lands between the root and the third
    assert arpeggio_pitches(Chord(0, QUALITIES["9"]), 48) == (48, 52, 56, 62, 68, 72)
