from fretless.tab.alterations import fitted, placed_chord, transposed, unsupported_system
from fretless.tab.convert_model import PlacedNote
from fretless.tab.events import Event

EVENT = Event(2, 7, (100, 90, 80))


def test_transposed_names_direction_and_octaves() -> None:
    assert transposed(-24).message == "Whole piece moved down an octave to fit the oud."
    assert transposed(48).message == "Whole piece moved up 2 octaves to fit the oud."
    assert (transposed(24).kind, transposed(24).system, transposed(24).column) == (
        "transposed",
        None,
        None,
    )


def test_unsupported_system_says_which_and_why() -> None:
    a = unsupported_system(3, 7)
    assert (a.kind, a.system, a.column) == ("unsupported_system", 3, None)
    assert "7-line" in a.message


def test_fitted_reports_each_moved_note_with_direction() -> None:
    found = fitted(EVENT, (140, 90, 30), (116, 90, 54))
    assert [(a.kind, a.system, a.column) for a in found] == [("octave_shifted", 2, 7)] * 2
    assert found[0].message == "Note moved down an octave to fit the oud."
    assert found[1].message == "Note moved up an octave to fit the oud."
    assert fitted(EVENT, (140,), (92,))[0].message == "Note moved down 2 octaves to fit the oud."
    assert fitted(EVENT, (100, 90), (100, 90)) == []


def test_chord_reports_moved_and_dropped_notes() -> None:
    notes = (PlacedNote(1, 4, 100), PlacedNote(3, 0, 76))  # 80 left out? no: 90 and 80 gone
    found = placed_chord(EVENT, (100, 90, 80), notes)
    assert [a.kind for a in found] == ["octave_shifted", "chord_reduced"]
    assert found[1].message.startswith("1 chord note left out")
    assert (found[1].system, found[1].column) == (2, 7)
    two = placed_chord(EVENT, (100, 90, 80), (PlacedNote(1, 4, 100),))
    assert two[0].message.startswith("2 chord notes left out")


def test_nothing_to_report_for_a_chord_placed_as_wanted() -> None:
    notes = tuple(PlacedNote(c, 0, p) for c, p in ((1, 100), (2, 90), (3, 80)))
    assert placed_chord(EVENT, (100, 90, 80), notes) == []


def test_transposed_names_semitones_and_quarter_tones() -> None:
    assert transposed(-4).message == "Whole piece moved down 2 semitones to fit the oud."
    assert transposed(2).message == "Whole piece moved up 1 semitone to fit the oud."
    assert transposed(-1).message == "Whole piece moved down 1 quarter-tone to fit the oud."
    assert transposed(3).message == "Whole piece moved up 3 quarter-tones to fit the oud."
