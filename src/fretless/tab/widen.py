"""Work out how far to push things right so printed text never touches or overwrites."""

from collections import defaultdict
from dataclasses import dataclass
from itertools import pairwise

from fretless.tab.render_model import RenderCell

_BAR, _CELL, _END = 0, 1, 2

# (index, kind, printed length): bars sort before cells at the same index, the end last
type _Item = tuple[int, int, int]
type _Key = tuple[int, int]


@dataclass(frozen=True)
class Widened:
    bar: dict[int, int]  # original bar index -> new index
    cell: dict[int, int]  # original cell index -> new index (shared by every line)
    width: int  # new content width


def widen(width: int, bars: tuple[int, ...], cells: tuple[RenderCell, ...]) -> Widened:
    """New positions for bars, cells and width so that no text overlaps on any line.

    Extra dashes are inserted at a position in every line, so columns stay aligned.
    """
    lines = _items_per_line(width, bars, cells)
    needs = _needs(lines)
    shift = _shifts(sorted({(i, k) for line in lines for i, k, _ in line}), needs)
    return Widened(
        bar={i: i + shift[(i, _BAR)] for i in bars},
        cell={c.index: c.index + shift[(c.index, _CELL)] for c in cells},
        width=width + shift[(width, _END)],
    )


def _items_per_line(
    width: int, bars: tuple[int, ...], cells: tuple[RenderCell, ...]
) -> list[list[_Item]]:
    lines = sorted({c.line for c in cells})
    return [
        sorted(
            [(b, _BAR, 1) for b in bars]
            + [(c.index, _CELL, len(c.text)) for c in cells if c.line == line]
            + [(width, _END, 0)]
        )
        for line in lines or [0]
    ]


def _needs(lines: list[list[_Item]]) -> dict[_Key, list[tuple[_Key, int]]]:
    """For each item, (earlier item, extra shift it needs beyond that item's shift)."""
    needs: dict[_Key, list[tuple[_Key, int]]] = defaultdict(list)
    for items in lines:
        for (ia, ka, la), (ib, kb, _) in pairwise(items):
            gap = 1 if ka == kb == _CELL else 0
            if (ia, ka) != (ib, kb) and la + gap > ib - ia:
                needs[(ib, kb)].append(((ia, ka), la + gap - (ib - ia)))
    return needs


def _shifts(keys: list[_Key], needs: dict[_Key, list[tuple[_Key, int]]]) -> dict[_Key, int]:
    """Cumulative dashes inserted before each item, never decreasing left to right."""
    shift: dict[_Key, int] = {}
    previous = 0
    for key in keys:
        previous = max([previous, *(shift[a] + extra for a, extra in needs[key])])
        shift[key] = previous
    return shift
