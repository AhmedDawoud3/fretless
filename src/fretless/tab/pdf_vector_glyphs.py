"""Extract noteheads, clefs, and accidentals from compound vector PDF drawing subpaths."""

from dataclasses import dataclass

import pymupdf

from fretless.tab.pdf_geometry import Staff

_HEAD_FILLED = 0xE0A4
_CLEF_TREBLE = 0xE050
_ACC_FLAT = 0xE260
_ACC_NATURAL = 0xE261
_ACC_SHARP = 0xE262
_ACC_HALF_FLAT = 0xE280
_ACC_HALF_SHARP = 0xE282


@dataclass(frozen=True)
class Glyph:
    """One extracted sheet-music glyph positioned in page coordinates."""

    x: float
    y: float
    code: int


@dataclass(frozen=True)
class _Subpath:
    items: tuple[tuple[object, ...], ...]
    x0: float
    y0: float
    x1: float
    y1: float

    @property
    def w(self) -> float:
        return self.x1 - self.x0

    @property
    def h(self) -> float:
        return self.y1 - self.y0

    @property
    def cx(self) -> float:
        return (self.x0 + self.x1) / 2.0

    @property
    def cy(self) -> float:
        return (self.y0 + self.y1) / 2.0

    @property
    def area(self) -> float:
        return self.w * self.h


def _subpath_endpoints(item: tuple[object, ...]) -> tuple[pymupdf.Point, pymupdf.Point] | None:
    kind = item[0]
    if kind == "l" and isinstance(item[1], pymupdf.Point) and isinstance(item[2], pymupdf.Point):
        return item[1], item[2]
    if kind == "c" and isinstance(item[1], pymupdf.Point) and isinstance(item[4], pymupdf.Point):
        return item[1], item[4]
    return None


def _item_points(item: tuple[object, ...]) -> list[tuple[float, float]]:
    kind = item[0]
    if kind == "re" and isinstance(item[1], pymupdf.Rect):
        r = item[1]
        return [(r.x0, r.y0), (r.x1, r.y1)]
    return [(pt.x, pt.y) for pt in item[1:] if isinstance(pt, pymupdf.Point)]


def _build_subpath(items: list[tuple[object, ...]]) -> _Subpath:
    pts = [pt for item in items for pt in _item_points(item)]
    xs = [x for x, _ in pts]
    ys = [y for _, y in pts]
    return _Subpath(tuple(items), min(xs), min(ys), max(xs), max(ys))


def _disconnected(start: pymupdf.Point, prev_end: pymupdf.Point | None) -> bool:
    if prev_end is None:
        return False
    return abs(start.x - prev_end.x) > 0.05 or abs(start.y - prev_end.y) > 0.05


def split_subpaths(items: list[tuple[object, ...]]) -> list[_Subpath]:
    """Split a compound PyMuPDF drawing item list into connected subpaths."""
    subpaths: list[_Subpath] = []
    cur: list[tuple[object, ...]] = []
    prev_end: pymupdf.Point | None = None
    for item in items:
        if item[0] == "re":
            if cur:
                subpaths.append(_build_subpath(cur))
                cur = []
            subpaths.append(_build_subpath([item]))
            prev_end = None
            continue
        ends = _subpath_endpoints(item)
        if ends is None:
            continue
        if _disconnected(ends[0], prev_end) and cur:
            subpaths.append(_build_subpath(cur))
            cur = []
        cur.append(item)
        prev_end = ends[1]
    if cur:
        subpaths.append(_build_subpath(cur))
    return subpaths


def _contains(outer: _Subpath, inner: _Subpath, tol: float = 0.5) -> bool:
    return (
        inner.x0 >= outer.x0 - tol
        and inner.x1 <= outer.x1 + tol
        and inner.y0 >= outer.y0 - tol
        and inner.y1 <= outer.y1 + tol
    )


def _enclosing_candidate(
    j: int, subpaths: list[_Subpath], inner: _Subpath, best_area: float
) -> float | None:
    outer = subpaths[j]
    if outer.area <= inner.area * 1.05 or outer.area >= best_area:
        return None
    return outer.area if _contains(outer, inner) else None


def _best_enclosing_index(idx: int, order: list[int], subpaths: list[_Subpath]) -> int | None:
    inner = subpaths[order[idx]]
    best_j: int | None = None
    best_area = float("inf")
    for oj, j in enumerate(order):
        if oj == idx:
            continue
        if subpaths[j].x0 > inner.x0 + 0.5:
            break
        area = _enclosing_candidate(j, subpaths, inner, best_area)
        if area is not None:
            best_j, best_area = j, area
    return best_j


def _pair_outer_with_holes(subpaths: list[_Subpath]) -> list[tuple[_Subpath, list[_Subpath]]]:
    order = sorted(range(len(subpaths)), key=lambda i: subpaths[i].x0)
    is_inner = [False] * len(subpaths)
    children: list[list[_Subpath]] = [[] for _ in subpaths]
    for pos, orig in enumerate(order):
        parent = _best_enclosing_index(pos, order, subpaths)
        if parent is not None:
            is_inner[orig] = True
            children[parent].append(subpaths[orig])
    return [(sp, children[i]) for i, sp in enumerate(subpaths) if not is_inner[i]]


def _drawing_items(raw: object) -> list[tuple[object, ...]]:
    if not isinstance(raw, list):
        return []
    return [it for it in raw if isinstance(it, tuple)]


def _usable_drawing(drawing: dict[object, object]) -> tuple[bool, list[tuple[object, ...]]] | None:
    fill, color = drawing.get("fill"), drawing.get("color")
    if fill == (1.0, 1.0, 1.0) or (fill is None and color is None) or drawing.get("type") == "s":
        return None
    items = _drawing_items(drawing.get("items"))
    if not items or (fill is None and not any(it[0] == "c" for it in items)):
        return None
    return (fill is not None), items


def _nearest_staff(cx: float, cy: float, staves: list[Staff]) -> Staff | None:
    best: tuple[float, Staff] | None = None
    for staff in staves:
        dy = (staff.ys[-1] - staff.ys[0]) / 4.0
        if staff.x0 <= cx <= staff.x1 and staff.ys[0] - 3.5 * dy <= cy <= staff.ys[-1] + 3.5 * dy:
            dist = abs(cy - (staff.ys[0] + staff.ys[-1]) / 2.0)
            if best is None or dist < best[0]:
                best = (dist, staff)
    return best[1] if best is not None else None


def _is_notehead(sp: _Subpath, staff: Staff, dy: float) -> bool:
    wn, hn = sp.w / dy, sp.h / dy
    return (
        staff.x0 + 6.0 <= sp.cx <= staff.x1 - 2.0
        and 4 <= len(sp.items) <= 12
        and all(it[0] == "c" for it in sp.items)
        and 0.55 <= hn <= 1.35
        and 0.75 <= wn <= 2.35
        and sp.w >= sp.h * 1.05
    )


def _is_curved_hole(hole: _Subpath) -> bool:
    return any(it[0] == "c" for it in hole.items)


def _is_quad_hole(hole: _Subpath) -> bool:
    return len(hole.items) == 4 and all(it[0] == "l" for it in hole.items)


def _classify_one_hole_accidental(sp: _Subpath, hole: _Subpath, dy: float) -> Glyph | None:
    wn, n = sp.w / dy, len(sp.items)
    y_frac = (hole.cy - sp.y0) / sp.h
    if 0.60 <= y_frac <= 0.85 and _is_curved_hole(hole):
        code = _ACC_HALF_FLAT if (wn >= 1.10 or n >= 24) else _ACC_FLAT
        return Glyph(sp.cx, hole.cy, code)
    if 0.40 <= y_frac <= 0.60 and _is_quad_hole(hole):
        code = _ACC_SHARP if (wn >= 0.90 or n >= 24) else _ACC_NATURAL
        return Glyph(sp.cx, hole.cy, code)
    return None


def _classify_accidental(sp: _Subpath, holes: list[_Subpath], dy: float) -> Glyph | None:
    wn, hn = sp.w / dy, sp.h / dy
    if not (2.0 <= hn <= 3.6 and 0.50 <= wn <= 1.60):
        return None
    if len(holes) == 1:
        return _classify_one_hole_accidental(sp, holes[0], dy)
    if len(holes) == 0 and wn <= 0.85 and len(sp.items) >= 24:
        return Glyph(sp.cx, sp.cy, _ACC_HALF_SHARP)
    return None


def _classify_subpath(
    sp: _Subpath, holes: list[_Subpath], staff: Staff, filled: bool
) -> Glyph | None:
    dy = (staff.ys[-1] - staff.ys[0]) / 4.0
    if _is_notehead(sp, staff, dy):
        return Glyph(sp.cx, sp.cy, _HEAD_FILLED)
    if not filled or sp.h <= 0.0:
        return None
    wn, hn = sp.w / dy, sp.h / dy
    if 4.5 <= hn <= 9.0 and 1.5 <= wn <= 3.5 and sp.cx <= staff.x0 + 6.0 * dy:
        return Glyph(sp.cx, sp.cy, _CLEF_TREBLE)
    return _classify_accidental(sp, holes, dy)


def extract_page_vector_glyphs(page: pymupdf.Page, staves: list[Staff]) -> list[Glyph]:
    """Extract noteheads, clefs, and accidentals from vector subpaths on `page`."""
    if not staves:
        return []
    glyphs: list[Glyph] = []
    for drawing in page.get_drawings():
        usable = _usable_drawing(drawing)
        if usable is None:
            continue
        filled, items = usable
        for sp, holes in _pair_outer_with_holes(split_subpaths(items)):
            staff = _nearest_staff(sp.cx, sp.cy, staves)
            if staff is not None and (glyph := _classify_subpath(sp, holes, staff, filled)):
                glyphs.append(glyph)
    return glyphs
