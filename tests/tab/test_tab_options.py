from fretless.tab.convert_model import PlacedNote
from fretless.tab.options import MAX_OPTIONS, options
from fretless.tab.transpose import oud_range
from fretless.tuning import TUNINGS

CC = TUNINGS["cc"]
SPAN = oud_range(CC)


def test_single_note_options_start_with_the_open_course() -> None:
    found = options(CC, SPAN, (86,))
    assert [o.notes for o in found] == [(PlacedNote(2, 0, 86),), (PlacedNote(3, 10, 86),)]
    assert found[0].cost < found[1].cost


def test_an_unplayable_chord_falls_back_to_the_top_note() -> None:
    found = options(CC, SPAN, (62, 120))
    assert [o.notes for o in found] == [(PlacedNote(1, 24, 120),)]


def test_a_playable_chord_keeps_every_note() -> None:
    found = options(CC, SPAN, (96, 86))
    assert {len(o.notes) for o in found} == {2}
    assert found[0].notes == (PlacedNote(1, 0, 96), PlacedNote(2, 0, 86))


def test_an_inner_note_moves_an_octave_before_any_note_is_dropped() -> None:
    # 52 and 48 can only be played on course 6, so the inner 52 goes up to 76 (open course 3)
    found = options(CC, SPAN, (96, 52, 48))
    assert found[0].notes == (PlacedNote(1, 0, 96), PlacedNote(3, 0, 76), PlacedNote(6, 0, 48))


def test_options_are_capped_and_sorted_by_cost() -> None:
    found = options(CC, SPAN, (96, 86, 76))
    assert len(found) <= MAX_OPTIONS
    assert [o.cost for o in found] == sorted(o.cost for o in found)
