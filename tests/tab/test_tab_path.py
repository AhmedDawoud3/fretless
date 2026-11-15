from fretless.tab.convert_model import PlacedNote
from fretless.tab.costs import W_JUMP, W_SHIFT
from fretless.tab.options import Option
from fretless.tab.path import best_path


def opt(course: int, position: int, cost: int) -> Option:
    return Option((PlacedNote(course, position, 0),), cost)


def test_no_events_no_path() -> None:
    assert best_path(()) == ()


def test_a_single_event_takes_its_cheapest_option() -> None:
    cheap, dear = opt(2, 0, 0), opt(3, 10, 23)
    assert best_path(((cheap, dear),)) == (cheap,)


def test_the_hand_stays_put_when_it_pays_across_events() -> None:
    far, near = opt(1, 10, 0), opt(1, 2, 0)
    assert best_path(((far, near), (opt(2, 4, 0),), (opt(3, 4, 0),))) == (
        near,
        opt(2, 4, 0),
        opt(3, 4, 0),
    )


def test_an_open_event_does_not_forget_where_the_hand_was() -> None:
    # starting at position 10 costs nothing now but forces an 8-step move after the open note
    start_far, start_near = opt(1, 10, 0), opt(1, 2, W_SHIFT * 8 - 12)
    open_note, end = opt(2, 0, 0), opt(3, 2, 0)
    path = best_path(((start_far, start_near), (open_note,), (end,)))
    assert path[0] == start_near


def test_a_jump_over_courses_between_single_notes_costs_extra() -> None:
    first = opt(1, 4, 0)
    near, far = opt(2, 4, W_JUMP), opt(4, 4, W_JUMP - 1)
    assert best_path(((first,), (near, far))) == (first, near)


def test_equal_costs_resolve_to_the_first_option() -> None:
    a, b = opt(2, 0, 5), opt(3, 0, 5)
    assert best_path(((a, b),)) == (a,)
