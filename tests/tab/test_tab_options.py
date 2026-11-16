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


def test_five_notes_become_the_cheapest_four_note_shape_keeping_top_and_bass() -> None:
    # C3 E3 G3 C4 E4 -> E4 on course 1 fret 4, G3 open course 2, E3 course 3 fret 2, C3 course 4
    # fret 3; every position is at most 10 steps
    found = options(CC, SPAN, (104, 96, 86, 80, 72))
    assert found[0].notes == (
        PlacedNote(1, 8, 104),
        PlacedNote(2, 0, 86),
        PlacedNote(3, 4, 80),
        PlacedNote(4, 6, 72),
    )
    assert all(len(o.notes) <= 4 for o in found)


def test_a_chord_needing_a_stretch_above_position_ten_loses_a_note_to_stay_easy() -> None:
    # D3 B2 A2: 60 and 62 sit two steps apart, so one must take course 6 at position 12 or 14.
    # Dropping the 62 (inner note) leaves D3 open on course 3 and the bass 60 at position 2.
    found = options(CC, SPAN, (76, 62, 60))
    assert found[0].notes == (PlacedNote(3, 0, 76), PlacedNote(5, 2, 60))


def test_a_stopped_note_exactly_at_position_ten_is_still_easy_enough_to_keep_the_chord() -> None:
    # A2 and G#2 (70, 68): 70 on course 4 position 4 and 68 on course 5 position 10 is the only
    # fingerable pair; position 10 is the threshold, not above it, so no note is dropped
    found = options(CC, SPAN, (70, 68))
    assert [o.notes for o in found] == [(PlacedNote(4, 4, 70), PlacedNote(5, 10, 68))]


def test_every_option_of_an_event_has_the_same_notes() -> None:
    found = options(CC, SPAN, (104, 96, 86, 80, 72))
    assert len(found) > 1
    assert len({tuple(sorted(n.pitch for n in o.notes)) for o in found}) == 1
