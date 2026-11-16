from fretless.tab.convert_model import PlacedNote
from fretless.tab.costs import (
    W_GAP,
    W_JUMP,
    W_POSITION,
    W_SHIFT,
    W_SPAN,
    W_STOPPED,
    hand_position,
    local_cost,
    move_cost,
    shift_cost,
)


def notes(*spots: tuple[int, int]) -> tuple[PlacedNote, ...]:
    return tuple(PlacedNote(c, p, 0) for c, p in spots)


def test_local_cost_terms() -> None:
    assert local_cost(notes((2, 0))) == 0
    assert local_cost(notes((2, 4))) == W_STOPPED + 4 * W_POSITION
    assert local_cost(notes((1, 4), (2, 8))) == 2 * W_STOPPED + 12 * W_POSITION + 4 * W_SPAN
    assert local_cost(notes((1, 0), (3, 0))) == W_GAP
    assert local_cost(notes((1, 0), (2, 0), (3, 0))) == 0


def test_hand_position_is_the_lowest_stopped_position() -> None:
    assert hand_position(notes((1, 0), (2, 0))) is None
    assert hand_position(notes((1, 0), (2, 6), (3, 4))) == 4


def test_course_jumps_only_cost_between_single_notes() -> None:
    assert move_cost(notes((1, 2)), notes((4, 2))) == 2 * W_JUMP
    assert move_cost(notes((1, 2)), notes((2, 2))) == 0
    assert move_cost(notes((2, 2)), notes((2, 4))) == 0
    assert move_cost(notes((4, 2)), notes((1, 2))) == 2 * W_JUMP
    assert move_cost(notes((1, 2), (2, 2)), notes((5, 2))) == 0
    assert move_cost(notes((1, 2)), notes((4, 2), (5, 2))) == 0


def test_hand_shift_cost_is_symmetric_and_free_when_unknown() -> None:
    assert shift_cost(2, 6) == shift_cost(6, 2) == 4 * W_SHIFT
    assert shift_cost(None, 6) == shift_cost(6, None) == shift_cost(5, 5) == 0


def test_a_quarter_tone_position_counts_as_stopped() -> None:
    assert local_cost(notes((2, 1))) == W_STOPPED + W_POSITION
    assert hand_position(notes((1, 0), (2, 1))) == 1
