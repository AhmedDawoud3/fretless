from fretless.tab.transpose import best_shift, fold, oud_range
from fretless.tuning import TUNINGS

CC = TUNINGS["cc"]
FF = TUNINGS["ff"]


def test_range_runs_from_lowest_open_course_to_top_of_course_one() -> None:
    assert (oud_range(CC).low, oud_range(CC).high) == (48, 120)  # C2 to C5
    assert (oud_range(FF).low, oud_range(FF).high) == (58, 130)  # F2 to F5


def test_in_range_pitches_need_no_shift() -> None:
    assert best_shift((48, 96, 120), oud_range(CC)) == 0


def test_melody_above_the_range_moves_down_an_octave() -> None:
    assert best_shift((138, 142, 144), oud_range(CC)) == -24


def test_melody_below_the_range_moves_up_one_or_two_octaves() -> None:
    assert best_shift((40, 42), oud_range(CC)) == 24  # E1 area: one octave is enough
    assert best_shift((16, 18), oud_range(CC)) == 48  # two octaves


def test_ties_prefer_no_shift_then_the_smaller_shift_then_down() -> None:
    assert best_shift((), oud_range(CC)) == 0
    # shifting down or up by an octave each leaves one note out; going down is chosen
    assert best_shift((36, 140), oud_range(CC)) == -24


def test_stray_low_note_does_not_move_the_whole_piece() -> None:
    assert best_shift((40, 96, 100, 104, 108), oud_range(CC)) == 0


def test_fold_moves_by_octaves_into_range() -> None:
    assert fold(40, oud_range(CC)) == 64
    assert fold(16, oud_range(CC)) == 64
    assert fold(124, oud_range(CC)) == 100
    assert fold(148, oud_range(CC)) == 100
    assert fold(48, oud_range(CC)) == 48
    assert fold(120, oud_range(CC)) == 120
