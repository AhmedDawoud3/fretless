"""Render tab structures back to ASCII."""

from fretless.tab.model import Block, TabSystem, TextBlock
from fretless.tab.render_model import RenderCell, RenderSystem
from fretless.tab.widen import widen


def to_render_system(system: TabSystem) -> RenderSystem:
    """A system that prints every note's fret number where it was."""
    cells = tuple(
        RenderCell(note.line, column.index, f"{note.fret}.5" if note.half else str(note.fret))
        for column in system.columns
        for note in column.notes
    )
    return RenderSystem(system.labels, system.width, system.bars, cells)


def render_system(system: RenderSystem) -> str:
    """One line per string: label, bar, dashes with bars and cell text, closing bar."""
    moved = widen(system.width, system.bars, system.cells)
    pad = max(len(label) for label in system.labels)
    return "\n".join(
        f"{label.ljust(pad)}|{_content(line, moved.width, system, moved.bar, moved.cell)}|"
        for line, label in enumerate(system.labels, start=1)
    )


def _content(
    line: int, width: int, system: RenderSystem, bar: dict[int, int], cell: dict[int, int]
) -> str:
    chars = ["-"] * width
    for at in bar.values():
        chars[at] = "|"
    for c in system.cells:
        if c.line == line:
            at = cell[c.index]
            chars[at : at + len(c.text)] = c.text
    return "".join(chars)


def render_document(blocks: tuple[Block | RenderSystem, ...]) -> str:
    """Text blocks verbatim and systems rendered, one block after another."""
    return "\n".join(
        block.text if isinstance(block, TextBlock) else render_system(_as_render(block))
        for block in blocks
    )


def _as_render(block: TabSystem | RenderSystem) -> RenderSystem:
    return to_render_system(block) if isinstance(block, TabSystem) else block
