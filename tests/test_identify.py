from hypothesis import given
from hypothesis import strategies as st

from fretless.chord import QUALITIES, Chord, chord_pitch_classes
from fretless.guitar import GUITAR_TUNINGS, shape_pitches
from fretless.identify import identify

STANDARD = GUITAR_TUNINGS["standard"].strings


def chart(text: str) -> tuple[int, ...]:
    """Pitches of a chord-chart shape such as "x32010" (written string 6 first)."""
    frets = tuple(None if c == "x" else int(c) for c in reversed(text))
    return shape_pitches(STANDARD, 0, frets)


def first(text: str) -> Chord:
    return identify(chart(text))[0].chord


def test_open_shapes_name_the_chord_you_know() -> None:
    assert first("x32010") == Chord(0, QUALITIES["maj"])
    assert first("320003") == Chord(14, QUALITIES["maj"])
    assert first("x02210") == Chord(18, QUALITIES["min"])
    assert first("xx0232") == Chord(4, QUALITIES["maj"])
    assert first("022100") == Chord(8, QUALITIES["maj"])
    assert first("133211") == Chord(10, QUALITIES["maj"])


def test_c7_shape_lacks_a_fifth_and_says_so() -> None:
    match = identify(chart("x32310"))[0]

    assert match.chord == Chord(0, QUALITIES["7"])
    assert match.missing == ("fifth",)
    assert match.bass == 0


def test_a_minor_7_ranks_before_c6_for_the_same_notes() -> None:
    chords = [m.chord for m in identify(chart("x02010"))]

    assert chords[0] == Chord(18, QUALITIES["m7"])
    assert chords[1] == Chord(0, QUALITIES["6"])


def test_exact_match_outranks_a_closer_bass() -> None:
    # 3x2010 is C/G: C major with G in the bass.
    matches = identify(chart("3x2010"))

    assert matches[0].chord == Chord(0, QUALITIES["maj"])
    assert matches[0].bass == 14


def test_two_notes_give_a_power_chord_first() -> None:
    assert identify((48, 62))[0].chord == Chord(0, QUALITIES["5"])


def test_too_few_distinct_notes_give_nothing() -> None:
    assert identify(()) == ()
    assert identify((48,)) == ()
    assert identify((48, 72)) == ()


def test_a_quarter_tone_note_gives_nothing() -> None:
    assert identify((48, 55, 62)) == ()


@given(st.lists(st.integers(24, 144), min_size=2, max_size=6))
def test_every_match_covers_the_shape(pitches: list[int]) -> None:
    even = tuple(p - p % 2 for p in pitches)
    for match in identify(even):
        chord_classes = set(chord_pitch_classes(match.chord))
        assert {p % 24 for p in even} <= chord_classes
        assert match.chord.root in {p % 24 for p in even}
