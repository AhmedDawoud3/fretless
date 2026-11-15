import pytest

from fretless.tab.columns import bar_offsets, build_columns, line_notes, split_frets
from fretless.tab.model import Column, TabNote


@pytest.mark.parametrize(
    ("digits", "frets"),
    [
        ("0", [0]),
        ("7", [7]),
        ("10", [10]),
        ("12", [12]),
        ("24", [24]),
        ("25", [2, 5]),
        ("35", [3, 5]),
        ("05", [0, 5]),
        ("245", [24, 5]),
        ("121", [12, 1]),
    ],
)
def test_split_frets_reads_two_digits_up_to_24(digits: str, frets: list[int]) -> None:
    assert [fret for _, fret in split_frets(digits)] == frets


def test_split_frets_gives_offsets() -> None:
    assert split_frets("245") == [(0, 24), (2, 5)]


def test_line_notes_use_first_digit_index_and_drop_symbols() -> None:
    assert line_notes("--10-12h14p12--") == [(2, 10), (5, 12), (8, 14), (11, 12)]


def test_line_notes_drop_dead_notes() -> None:
    assert line_notes("--x--X--3") == [(8, 3)]


def test_line_notes_adjacent_digits() -> None:
    assert line_notes("-35-24-25") == [(1, 3), (2, 5), (4, 24), (7, 2), (8, 5)]


def test_bar_offsets() -> None:
    assert bar_offsets("--|--0--||-") == (2, 8, 9)


def test_build_columns_groups_same_index_across_lines() -> None:
    per_line = [[(2, 0), (6, 3)], [(2, 1)], [], [(2, 2)]]
    assert build_columns(per_line) == (
        Column(2, (TabNote(1, 0), TabNote(2, 1), TabNote(4, 2))),
        Column(6, (TabNote(1, 3),)),
    )
