"""The shape of a parsed ASCII tab: systems of columns of notes, and text between them."""

from dataclasses import dataclass
from itertools import pairwise


@dataclass(frozen=True)
class TabNote:
    line: int  # 1 = top line (highest string / course)
    fret: int  # fret number as written in the tab

    def __post_init__(self) -> None:
        if self.fret < 0:
            raise ValueError(f"fret must be 0 or more, got {self.fret}")


@dataclass(frozen=True)
class Column:
    index: int  # character offset within the system content (after the label and first bar)
    notes: tuple[TabNote, ...]  # ordered by line, at least one

    def __post_init__(self) -> None:
        if not self.notes:
            raise ValueError("a column needs at least one note")
        lines = [n.line for n in self.notes]
        if lines != sorted(set(lines)):
            raise ValueError("column notes must be ordered by line, one per line")


@dataclass(frozen=True)
class TabSystem:
    lines: int  # number of strings
    width: int  # content width in characters
    bars: tuple[int, ...]  # character offsets of bar lines inside the content
    columns: tuple[Column, ...]  # ordered by index
    labels: tuple[str, ...]  # original line labels, top to bottom ("" when absent)
    techniques: tuple[tuple[int, int, str], ...] = ()  # (line, column_index, symbol)

    def __post_init__(self) -> None:
        if len(self.labels) != self.lines:
            raise ValueError("labels must have one entry per line")
        indexes = [c.index for c in self.columns]
        if any(a >= b for a, b in pairwise(indexes)):
            raise ValueError("column indexes must strictly increase")
        if any(not 1 <= n.line <= self.lines for c in self.columns for n in c.notes):
            raise ValueError(f"note line must be within 1..{self.lines}")


@dataclass(frozen=True)
class TextBlock:
    text: str  # one or more non-tab lines, verbatim


type Block = TabSystem | TextBlock


@dataclass(frozen=True)
class TabDocument:
    blocks: tuple[Block, ...]
