import pytest

from fretless.tab.model import Column, TabNote, TabSystem


def _system(
    columns: tuple[Column, ...] = (), lines: int = 6, bars: tuple[int, ...] = ()
) -> TabSystem:
    return TabSystem(lines, 10, bars, columns, ("",) * lines)


def test_a_valid_system_is_accepted() -> None:
    column = Column(2, (TabNote(1, 0), TabNote(6, 3)))
    assert _system((column, Column(5, (TabNote(2, 12),)))).columns[0] is column


def test_note_line_must_be_within_the_system() -> None:
    with pytest.raises(ValueError, match="line"):
        _system((Column(0, (TabNote(7, 1),)),))
    with pytest.raises(ValueError, match="line"):
        _system((Column(0, (TabNote(0, 1),)),))


def test_fret_cannot_be_negative() -> None:
    with pytest.raises(ValueError, match="fret"):
        TabNote(1, -1)


def test_columns_must_strictly_increase() -> None:
    notes = (TabNote(1, 0),)
    with pytest.raises(ValueError, match="increase"):
        _system((Column(3, notes), Column(3, notes)))


def test_a_column_needs_a_note_ordered_by_line() -> None:
    with pytest.raises(ValueError, match="note"):
        Column(0, ())
    with pytest.raises(ValueError, match="ordered"):
        Column(0, (TabNote(2, 0), TabNote(1, 0)))


def test_labels_match_lines() -> None:
    with pytest.raises(ValueError, match="labels"):
        TabSystem(6, 10, (), (), ("",) * 5)
