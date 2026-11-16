"""Read notes and bars out of the content of tab lines and group notes into columns."""

import re

from fretless.tab.model import Column, TabNote

_MAX_FRET = 24
_DIGITS = re.compile(r"\d+")
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


def line_notes(content: str) -> list[tuple[int, int]]:
    """(index, fret) of every note in one line's content; symbols and dead notes are dropped."""
    return [
        (run.start() + offset, fret)
        for run in _DIGITS.finditer(content)
        for offset, fret in split_frets(run.group())
    ]


def line_techniques(content: str) -> dict[int, str]:
    """Map starting offset to trailing technique symbol (`h`, `p`, `/`, `\\`, `b`, `~`)."""
    out: dict[int, str] = {}
    for run in _DIGITS.finditer(content):
        end = run.end()
        if end < len(content) and content[end] in _TECHNIQUE_CHARS:
            parts = split_frets(run.group())
            if parts:
                out[run.start() + parts[-1][0]] = content[end]
    return out


def bar_offsets(content: str) -> tuple[int, ...]:
    return tuple(i for i, char in enumerate(content) if char == "|")


def build_columns(per_line: list[list[tuple[int, int]]]) -> tuple[Column, ...]:
    """Group notes that start at the same index into columns; `per_line` runs top line first."""
    by_index: dict[int, list[TabNote]] = {}
    for line, notes in enumerate(per_line, start=1):
        for index, fret in notes:
            by_index.setdefault(index, []).append(TabNote(line, fret))
    return tuple(Column(index, tuple(notes)) for index, notes in sorted(by_index.items()))
