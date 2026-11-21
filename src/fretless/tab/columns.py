"""Read notes and bars out of the content of tab lines and group notes into columns."""

import re
from collections.abc import Sequence

from fretless.tab.model import Column, TabNote

_MAX_FRET = 24
_TOKEN = re.compile(r"\d+(?:\.5)?")
_TECHNIQUE_CHARS = frozenset("hp/\\br~")


def split_frets(digits: str) -> list[tuple[int, int]]:
    """Split a run of digits into (offset, fret) pairs.

    Two adjacent digits are one fret when they read 10 to 24, else two separate notes, so
    "12" is fret 12 and "35" is fret 3 then 5.
    """
    # ponytail: heuristic; ambiguous cases like `12` meaning 1 then 2 cannot be told apart
    # without rhythm. Upgrade path: take the bar's note spacing into account.
    frets: list[tuple[int, int]] = []
    at = 0
    while at < len(digits):
        two = digits[at : at + 2]
        width = 2 if len(two) == 2 and two[0] in "12" and int(two) <= _MAX_FRET else 1
        frets.append((at, int(digits[at : at + width])))
        at += width
    return frets


def line_tab_notes(content: str) -> list[tuple[int, int, bool]]:
    """(index, fret, half) of every note in one line's content; supports `.5` virtual frets."""
    out: list[tuple[int, int, bool]] = []
    for run in _TOKEN.finditer(content):
        token = run.group()
        is_half = token.endswith(".5")
        parts = split_frets(token.removesuffix(".5"))
        last = len(parts) - 1
        for idx, (offset, fret) in enumerate(parts):
            out.append((run.start() + offset, fret, is_half and idx == last))
    return out


def line_notes(content: str) -> list[tuple[int, int]]:
    """(index, fret) of every note in one line's content; symbols and dead notes are dropped."""
    return [(index, fret) for index, fret, _ in line_tab_notes(content)]


def line_techniques(content: str) -> dict[int, str]:
    """Map starting offset to trailing technique symbol (`h`, `p`, `/`, `\\`, `b`, `~`)."""
    out: dict[int, str] = {}
    for run in _TOKEN.finditer(content):
        end = run.end()
        if end < len(content) and content[end] in _TECHNIQUE_CHARS:
            parts = split_frets(run.group().removesuffix(".5"))
            if parts:
                out[run.start() + parts[-1][0]] = content[end]
    return out


def bar_offsets(content: str) -> tuple[int, ...]:
    return tuple(i for i, char in enumerate(content) if char == "|")


def _to_tab_note(line: int, item: tuple[int, int] | tuple[int, int, bool]) -> tuple[int, TabNote]:
    if len(item) == 3:
        return item[0], TabNote(line, item[1], half=item[2])
    return item[0], TabNote(line, item[1])


def build_columns(
    per_line: Sequence[Sequence[tuple[int, int] | tuple[int, int, bool]]],
) -> tuple[Column, ...]:
    """Group notes that start at the same index into columns; `per_line` runs top line first."""
    by_index: dict[int, list[TabNote]] = {}
    for line, notes in enumerate(per_line, start=1):
        for item in notes:
            index, note = _to_tab_note(line, item)
            by_index.setdefault(index, []).append(note)
    return tuple(Column(index, tuple(notes)) for index, notes in sorted(by_index.items()))
