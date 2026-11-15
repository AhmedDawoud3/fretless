"""Decide whether one line of text is a tab line, and split it into label and content."""

import re
from dataclasses import dataclass

# label (a string name such as e, B, Eb, D#, or nothing), a separator, then the rest
_LINE = re.compile(r"^\s*(?P<label>[A-Ga-g][#b]?)?\s*[|:](?P<rest>.*)$")
# dashes, digits, bars and technique symbols h p / \ b r ~ ^ t s ( ) = and dead notes x X
_CONTENT = re.compile(r"^[-0-9|hpbrtsxX/\\~^()=]*$")
_MIN_DASHES = 2


@dataclass(frozen=True)
class TabLine:
    label: str  # "" when absent
    content: str  # after the first bar, without the closing bar or any trailing comment


def parse_tab_line(line: str) -> TabLine | None:
    """The label and content of a tab line, or None when the line is some other text."""
    match = _LINE.match(line)
    if match is None:
        return None
    content = _content(match["rest"].rstrip())
    if content is None or content.count("-") < _MIN_DASHES:
        return None
    return TabLine(match["label"] or "", content.removesuffix("|"))


def _content(rest: str) -> str | None:
    """`rest` itself, or up to its last bar when a comment follows it, else None."""
    if _CONTENT.match(rest):
        return rest
    head = rest[: rest.rfind("|") + 1]
    return head if "|" in rest and _CONTENT.match(head) else None
