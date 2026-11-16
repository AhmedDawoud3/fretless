"""Shared vector PDF staff geometry, bar placement, and quantized tab rendering."""

from collections import defaultdict
from collections.abc import Sequence
from dataclasses import dataclass
from itertools import pairwise

import pymupdf

from fretless.tab.render import render_system
from fretless.tab.render_model import RenderCell, RenderSystem

_SUBDIVISIONS = (2, 3, 4, 6, 8, 12, 16)


@dataclass(frozen=True)
class Staff:
    ys: tuple[float, ...]
    x0: float
    x1: float
    bars: tuple[float, ...]


def _record_line(
    x1: float,
    y1: float,
    x2: float,
    y2: float,
    horz: dict[float, list[tuple[float, float]]],
    vert: list[tuple[float, float, float]],
) -> None:
    if abs(y1 - y2) < 0.5 and abs(x2 - x1) > 12.0:
        horz[round((y1 + y2) / 2.0, 1)].append((min(x1, x2), max(x1, x2)))
    elif abs(x1 - x2) < 0.5 and abs(y2 - y1) > 12.0:
        vert.append(((x1 + x2) / 2.0, min(y1, y2), max(y1, y2)))


def collect_segments(
    page: pymupdf.Page,
) -> tuple[dict[float, list[tuple[float, float]]], list[tuple[float, float, float]]]:
    """Collect horizontal staff segments and vertical barline segments on `page`."""
    horz: dict[float, list[tuple[float, float]]] = defaultdict(list)
    vert: list[tuple[float, float, float]] = []
    for drawing in page.get_drawings():
        for item in drawing["items"]:
            kind = item[0]
            if kind == "l":
                p1, p2 = item[1], item[2]
                _record_line(p1.x, p1.y, p2.x, p2.y, horz, vert)
            elif kind == "re":
                rect = item[1]
                if rect.height < 1.5 and rect.width > 12.0:
                    horz[round((rect.y0 + rect.y1) / 2.0, 1)].append((rect.x0, rect.x1))
                elif rect.width < 1.5 and rect.height > 12.0:
                    vert.append(((rect.x0 + rect.x1) / 2.0, rect.y0, rect.y1))
    return horz, vert


def merge_y_buckets(
    raw: dict[float, list[tuple[float, float]]],
) -> list[tuple[float, float, float]]:
    """Merge horizontal spans sharing a y-line within 0.8pt and filter to width > 150pt."""
    merged: list[tuple[float, float, float]] = []
    for y in sorted(raw):
        segs = raw[y]
        if sum(b - a for a, b in segs) <= 150.0:
            continue
        seg_x0 = min(a for a, _ in segs)
        seg_x1 = max(b for _, b in segs)
        if merged and abs(y - merged[-1][0]) <= 0.8:
            py, px0, px1 = merged[-1]
            merged[-1] = ((py + y) / 2.0, min(px0, seg_x0), max(px1, seg_x1))
        else:
            merged.append((y, seg_x0, seg_x1))
    return merged


def dedup_bars(bars: tuple[float, ...]) -> tuple[float, ...]:
    out: list[float] = []
    for bx in bars:
        if not out or bx - out[-1] > 6.0:
            out.append(bx)
    return tuple(out)


def _fits_staff_run(run: list[tuple[float, float, float]], y: float) -> bool:
    if len(run) == 1:
        return 3.0 <= y - run[-1][0] <= 15.0
    dy = (run[-1][0] - run[0][0]) / (len(run) - 1)
    return abs((y - run[-1][0]) - dy) <= 0.8


def _staff_from_run(
    run: list[tuple[float, float, float]], vert: list[tuple[float, float, float]], line_count: int
) -> Staff | None:
    if len(run) != line_count:
        return None
    x0 = max(item[1] for item in run)
    x1 = min(item[2] for item in run)
    if x1 - x0 <= 150.0:
        return None
    y0, y_end = run[0][0], run[-1][0]
    bars = tuple(
        sorted(
            bx
            for bx, by0, by1 in vert
            if x0 + 6.0 < bx < x1 - 4.0 and by0 <= y0 + 2.0 and by1 >= y_end - 2.0
        )
    )
    return Staff(tuple(item[0] for item in run), x0, x1, dedup_bars(bars))


def group_staves(
    lines: list[tuple[float, float, float]],
    vert: list[tuple[float, float, float]],
    line_count: int,
) -> list[Staff]:
    """Group evenly spaced horizontal lines into maximal staves matching `line_count`."""
    runs: list[list[tuple[float, float, float]]] = []
    for entry in lines:
        if not runs:
            runs.append([entry])
        elif _fits_staff_run(runs[-1], entry[0]):
            runs[-1].append(entry)
        elif len(runs[-1]) == 1:
            runs[-1] = [entry]
        else:
            runs.append([entry])
    return [staff for run in runs if (staff := _staff_from_run(run, vert, line_count)) is not None]


def _place_bars(
    bars: tuple[float, ...], xs: list[float], col_positions: list[int]
) -> tuple[int, ...]:
    placed: list[int] = []
    for bx in bars:
        after_idx = sum(1 for xc in xs if xc < bx)
        if after_idx == 0 or after_idx >= len(xs):
            continue
        pos = (col_positions[after_idx - 1] + col_positions[after_idx]) // 2
        if pos <= col_positions[after_idx - 1]:
            pos = col_positions[after_idx - 1] + 1
        if pos < col_positions[after_idx] and pos not in placed:
            placed.append(pos)
    return tuple(placed)


def _base_unit(xs: list[float], bars: tuple[float, ...]) -> float:
    in_measure = [
        b - a for a, b in pairwise(xs) if b - a > 4.0 and not any(a < bx < b for bx in bars)
    ]
    pool = sorted(in_measure or [b - a for a, b in pairwise(xs) if b - a > 4.0])
    if not pool:
        return 16.0
    anchor = pool[len(pool) // 8]
    return max(anchor, 8.0)


def _snap_musical_step(ratio: float) -> int:
    target = ratio * 2.0
    return min(_SUBDIVISIONS, key=lambda step: (abs(step - target), step))


def render_quantized_columns(
    staff: Staff,
    columns: Sequence[tuple[float, Sequence[tuple[int, int | str]]]],
    labels: tuple[str, ...],
) -> str:
    """Render `(x, [(line_no, cell), ...])` columns quantized by within-measure musical gaps."""
    xs = [xc for xc, _ in columns]
    unit = _base_unit(xs, staff.bars)
    col_positions: list[int] = [1]
    for a, b in pairwise(xs):
        crosses_bar = any(a < bx < b for bx in staff.bars)
        effective = max(unit, (b - a) - 0.5 * unit) if crosses_bar else (b - a)
        col_positions.append(col_positions[-1] + _snap_musical_step(effective / unit))
    cells = tuple(
        RenderCell(line_no, pos, str(text))
        for pos, (_xc, items) in zip(col_positions, columns, strict=True)
        for line_no, text in items
    )
    bar_positions = _place_bars(staff.bars, xs, col_positions)
    return render_system(RenderSystem(labels, col_positions[-1] + 2, bar_positions, cells))
