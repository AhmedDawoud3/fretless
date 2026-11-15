"""Parse pasted ASCII tab into a TabDocument of tab systems and text blocks."""

import re
from itertools import groupby

from fretless.tab.columns import bar_offsets, build_columns, line_notes
from fretless.tab.lines import TabLine, parse_tab_line
from fretless.tab.model import Block, TabDocument, TabSystem, TextBlock

_MIN_LINES = 4
_MAX_LINES = 7
_NEWLINE = re.compile(r"\r\n|\r|\n")


def parse_tab(text: str) -> TabDocument:
    """Split `text` into tab systems and the text between them, in order. Never raises."""
    if text == "":
        return TabDocument(())
    lines = _NEWLINE.split(text)
    parsed = [parse_tab_line(line) for line in lines]
    blocks: list[Block] = []
    start = 0
    for is_tab, run in groupby(parsed, key=lambda p: p is not None):
        count = len(list(run))
        blocks.extend(_blocks(lines[start : start + count], parsed[start : start + count], is_tab))
        start += count
    return TabDocument(tuple(_merge_text(blocks)))


def _blocks(lines: list[str], parsed: list[TabLine | None], is_tab: bool) -> list[Block]:
    """A run of tab-looking lines is a system when it has 4 to 7 lines, else text."""
    tab_lines = [p for p in parsed if p is not None]
    if is_tab and _MIN_LINES <= len(tab_lines) <= _MAX_LINES:
        return [_system(tab_lines)]
    return [TextBlock("\n".join(lines))]


def _merge_text(blocks: list[Block]) -> list[Block]:
    """Join neighbouring text blocks (a rejected run beside plain text) into one."""
    merged: list[Block] = []
    for block in blocks:
        if merged and isinstance(block, TextBlock) and isinstance(merged[-1], TextBlock):
            merged[-1] = TextBlock(merged[-1].text + "\n" + block.text)
        else:
            merged.append(block)
    return merged


def _system(tab_lines: list[TabLine]) -> TabSystem:
    contents = [line.content for line in tab_lines]
    bars = sorted({bar for content in contents for bar in bar_offsets(content)})
    columns = build_columns([line_notes(content) for content in contents])
    return TabSystem(
        lines=len(tab_lines),
        width=max(len(content) for content in contents),
        bars=tuple(bars),
        columns=columns,
        labels=tuple(line.label for line in tab_lines),
    )
