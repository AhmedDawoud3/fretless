from fretless.tab.convert_model import PlacedNote
from fretless.tab.costs import local_cost
from fretless.tab.placement import placements
from fretless.tuning import TUNINGS

CC = TUNINGS["cc"]  # courses 1..6 open at 96 86 76 66 58 48


def _as_sets(found: tuple[tuple[PlacedNote, ...], ...]) -> set[tuple[tuple[int, int], ...]]:
    return {tuple((n.course, n.position) for n in notes) for notes in found}


def test_a_single_pitch_is_found_on_every_course_that_reaches_it() -> None:
    # G3 = 86: open on course 2, ten steps up course 3
    assert _as_sets(placements(CC, (86,))) == {((2, 0),), ((3, 10),)}
    assert placements(CC, (86,))[0][0].pitch == 86


def test_pitch_outside_every_course_has_no_placement() -> None:
    assert placements(CC, (47,)) == ()
    assert placements(CC, (121,)) == ()


def test_chord_notes_sit_on_distinct_courses_in_course_order() -> None:
    # C4 = 96 on course 1 open or course 2 at 10; G3 = 86 on course 2 open or course 3 at 10
    assert _as_sets(placements(CC, (96, 86))) == {
        ((1, 0), (2, 0)),
        ((1, 0), (3, 10)),
        ((2, 10), (3, 10)),  # barred: adjacent courses at one position
    }


def test_courses_need_not_be_contiguous() -> None:
    assert ((1, 0), (3, 0)) in _as_sets(placements(CC, (96, 76)))


def test_unfingerable_sets_are_rejected() -> None:
    # 120 is course 1 at 24; 62 is course 6 at 14 or course 5 at 4: span over 8 either way
    assert placements(CC, (120, 62)) == ()


def _cost(*notes: tuple[int, int]) -> int:
    return local_cost(tuple(PlacedNote(c, p, 0) for c, p in notes))


def test_open_beats_stopped_and_lower_positions_beat_higher() -> None:
    assert _cost((2, 0)) < _cost((3, 2)) < _cost((3, 10))


def test_chords_prefer_a_small_span_and_adjacent_courses() -> None:
    assert _cost((1, 4), (2, 4)) < _cost((1, 4), (2, 8))
    assert _cost((1, 0), (2, 0)) < _cost((1, 0), (3, 0))
