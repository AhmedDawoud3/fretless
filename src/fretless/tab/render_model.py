"""What the renderer is given: text to print at positions, free-form so any notation fits."""

from dataclasses import dataclass


@dataclass(frozen=True)
class RenderCell:
    line: int  # 1 = top line
    index: int  # character offset within the content where the text starts
    text: str  # what is printed: a fret "12", a virtual fret "1.5", a note name


@dataclass(frozen=True)
class RenderSystem:
    labels: tuple[str, ...]  # one per line, top to bottom
    width: int  # content width in characters, before any widening
    bars: tuple[int, ...]
    cells: tuple[RenderCell, ...]
