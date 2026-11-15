from fretless.fingering import is_fingerable, stopped_span
from fretless.neck import Location


def stopped(*pairs: tuple[int, int]) -> tuple[Location, ...]:
    return tuple(Location(course, position) for course, position in pairs)


def test_span_is_highest_minus_lowest_stopped_position_ignoring_open_courses() -> None:
    assert stopped_span(stopped((1, 0), (2, 4), (3, 10))) == 6
    assert stopped_span(stopped((1, 0), (2, 0))) == 0
    assert stopped_span(stopped((1, 6))) == 0


def test_a_span_of_four_frets_is_the_limit() -> None:
    assert is_fingerable(stopped((1, 2), (2, 10)))
    assert not is_fingerable(stopped((1, 2), (2, 12)))


def test_open_courses_need_no_finger_and_do_not_widen_the_span() -> None:
    assert is_fingerable(stopped((1, 0), (2, 0), (3, 8), (4, 0)))


def test_three_fingers_are_fine() -> None:
    assert is_fingerable(stopped((1, 2), (2, 4), (3, 6)))


def test_four_different_positions_are_too_many_fingers() -> None:
    assert not is_fingerable(stopped((1, 2), (2, 4), (3, 6), (4, 8)))


def test_one_finger_can_bar_adjacent_courses_at_the_same_position() -> None:
    assert is_fingerable(stopped((1, 4), (2, 4), (3, 4), (4, 4)))
    assert is_fingerable(stopped((1, 4), (2, 4), (3, 6), (4, 6)))


def test_same_position_on_separated_courses_is_not_a_bar() -> None:
    assert not is_fingerable(stopped((1, 4), (2, 6), (3, 4), (4, 6)))
    assert not is_fingerable(stopped((1, 4), (2, 6), (3, 8), (4, 4)))
