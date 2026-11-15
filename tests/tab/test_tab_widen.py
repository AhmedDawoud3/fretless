from fretless.tab.render_model import RenderCell
from fretless.tab.widen import widen


def _cells(*cells: tuple[int, int, str]) -> tuple[RenderCell, ...]:
    return tuple(RenderCell(*c) for c in cells)


def test_no_collision_changes_nothing() -> None:
    result = widen(10, (5,), _cells((1, 0, "12"), (2, 3, "3"), (1, 6, "0")))
    assert (result.bar, result.cell, result.width) == ({5: 5}, {0: 0, 3: 3, 6: 6}, 10)


def test_cell_text_is_separated_from_the_next_cell_on_its_line() -> None:
    result = widen(10, (), _cells((1, 0, "12"), (1, 1, "3")))
    assert result.cell[0] == 0
    assert result.cell[1] == 3  # "12", one dash, "3"
    assert result.width == 12


def test_cells_directly_touching_get_one_dash() -> None:
    result = widen(10, (), _cells((1, 0, "1"), (1, 1, "2")))
    assert result.cell[1] == 2


def test_long_cell_before_a_bar_pushes_the_bar() -> None:
    result = widen(10, (1,), _cells((1, 0, "123")))
    assert result.bar[1] == 3
    assert result.width == 12


def test_a_cell_on_a_bar_index_goes_after_the_bar() -> None:
    result = widen(10, (4,), _cells((1, 4, "7")))
    assert (result.bar[4], result.cell[4]) == (4, 5)


def test_other_lines_keep_their_alignment_relative_to_each_other() -> None:
    result = widen(10, (1,), _cells((1, 0, "123"), (2, 2, "5"), (3, 2, "6"), (4, 5, "7")))
    assert result.cell[2] == 4  # pushed right with the bar, same index for both lines
    assert result.cell[5] - result.cell[2] == 3  # distance between untouched cells is kept


def test_a_cell_running_past_the_end_widens_the_system() -> None:
    result = widen(3, (), _cells((1, 2, "12")))
    assert result.width == 4
