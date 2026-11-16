"""Extract 6-line vector tabs, ASCII tabs, or chord progressions from PDF bytes."""

import unicodedata
from collections import defaultdict
from dataclasses import dataclass
from itertools import pairwise
from pathlib import Path
from statistics import median

import pymupdf

from fretless.tab.chords import STANDARD_STRINGS, expand_chord_sheet, has_six_line_tab
from fretless.tab.import_model import ImportedTab
from fretless.tab.oud_render import ascii_name
from fretless.tab.render import render_system
from fretless.tab.render_model import RenderCell, RenderSystem
from fretless.tab.tuning_parse import extract_tuning_from_text

_PUA_MAP = {"\uf062": "b", "\uf023": "#", "♭": "b", "♯": "#"}
_GUITAR_LABELS = ("e", "B", "G", "D", "A", "E")


@dataclass(frozen=True)
class _Staff:
    ys: tuple[float, ...]
    x0: float
    x1: float
    bars: tuple[float, ...]


@dataclass(frozen=True)
class _Word:
    x0: float
    y0: float
    x1: float
    y1: float
    text: str

    @property
    def xc(self) -> float:
        return (self.x0 + self.x1) / 2.0

    @property
    def yc(self) -> float:
        return (self.y0 + self.y1) / 2.0


def _collect_segments(
    page: pymupdf.Page,
) -> tuple[dict[float, list[tuple[float, float]]], list[tuple[float, float, float]]]:
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
                elif rect.width < 1.5 and rect.height > 15.0:
                    vert.append(((rect.x0 + rect.x1) / 2.0, rect.y0, rect.y1))
    return horz, vert


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
    elif abs(x1 - x2) < 0.5 and abs(y2 - y1) > 15.0:
        vert.append(((x1 + x2) / 2.0, min(y1, y2), max(y1, y2)))


def _merge_y_buckets(
    raw: dict[float, list[tuple[float, float]]],
) -> list[tuple[float, float, float]]:
    merged: list[tuple[float, float, float]] = []
    for y in sorted(raw):
        segs = raw[y]
        width = sum(b - a for a, b in segs)
        if width <= 150.0:
            continue
        seg_x0 = min(a for a, _ in segs)
        seg_x1 = max(b for _, b in segs)
        if merged and abs(y - merged[-1][0]) <= 0.8:
            py, px0, px1 = merged[-1]
            merged[-1] = ((py + y) / 2.0, min(px0, seg_x0), max(px1, seg_x1))
        else:
            merged.append((y, seg_x0, seg_x1))
    return merged


def _fits_staff_run(run: list[tuple[float, float, float]], y: float) -> bool:
    if len(run) == 1:
        return 3.5 <= y - run[-1][0] <= 15.0
    dy = (run[-1][0] - run[0][0]) / (len(run) - 1)
    return abs((y - run[-1][0]) - dy) <= 0.8


def _staff_from_run(
    run: list[tuple[float, float, float]], vert: list[tuple[float, float, float]]
) -> _Staff | None:
    if len(run) != 6:
        return None
    x0 = max(item[1] for item in run)
    x1 = min(item[2] for item in run)
    if x1 - x0 <= 150.0:
        return None
    y0, y5 = run[0][0], run[-1][0]
    bars = tuple(
        sorted(
            bx
            for bx, by0, by1 in vert
            if x0 + 6.0 < bx < x1 - 4.0 and by0 <= y0 + 2.0 and by1 >= y5 - 2.0
        )
    )
    return _Staff(tuple(item[0] for item in run), x0, x1, _dedup_bars(bars))


def _group_six_line_staves(
    lines: list[tuple[float, float, float]], vert: list[tuple[float, float, float]]
) -> list[_Staff]:
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
    return [staff for run in runs if (staff := _staff_from_run(run, vert)) is not None]


def _dedup_bars(bars: tuple[float, ...]) -> tuple[float, ...]:
    out: list[float] = []
    for bx in bars:
        if not out or bx - out[-1] > 6.0:
            out.append(bx)
    return tuple(out)


def _left_guard(staff: _Staff, words: list[_Word], dy: float) -> float:
    clefs = [
        w.x1
        for w in words
        if "\ue06d" in w.text
        and w.x0 < staff.x0 + 65.0
        and staff.ys[0] - dy <= w.yc <= staff.ys[-1] + dy
    ]
    return max(staff.x0 + 2.0, max(clefs) + 2.0) if clefs else staff.x0 + 2.0


def _staff_notes(staff: _Staff, words: list[_Word]) -> list[tuple[float, int, int]]:
    dy = (staff.ys[-1] - staff.ys[0]) / 5.0
    left = _left_guard(staff, words, dy)
    notes: list[tuple[float, int, int]] = []
    for word in words:
        if not (left <= word.xc <= staff.x1 - 1.0 and word.text.isdigit()):
            continue
        fret = int(word.text)
        if not (0 <= fret <= 24):
            continue
        distances = [(abs(word.yc - sy), idx + 1) for idx, sy in enumerate(staff.ys)]
        best_dist, line_no = min(distances)
        if best_dist <= 0.45 * dy:
            notes.append((word.xc, line_no, fret))
    return notes


def _cluster_columns(
    notes: list[tuple[float, int, int]],
) -> list[tuple[float, list[tuple[int, int]]]]:
    if not notes:
        return []
    ordered = sorted(notes, key=lambda n: (n[0], n[1]))
    groups: list[tuple[float, list[tuple[int, int]]]] = [
        (ordered[0][0], [(ordered[0][1], ordered[0][2])])
    ]
    for xc, line_no, fret in ordered[1:]:
        anchor_x, items = groups[-1]
        if abs(xc - anchor_x) <= 3.5:
            if not any(ln == line_no for ln, _ in items):
                items.append((line_no, fret))
        else:
            groups.append((xc, [(line_no, fret)]))
    return groups


def _render_staff(
    staff: _Staff,
    columns: list[tuple[float, list[tuple[int, int]]]],
    labels: tuple[str, ...],
) -> str:
    xs = [xc for xc, _ in columns]
    gaps = [b - a for a, b in pairwise(xs) if b - a > 4.0]
    unit = median(gaps) if gaps else 16.0
    unit = max(unit, 8.0)
    col_positions: list[int] = [1]
    for a, b in pairwise(xs):
        step = max(2, min(6, round((b - a) / unit * 2)))
        col_positions.append(col_positions[-1] + step)
    cells = tuple(
        RenderCell(line_no, pos, str(fret))
        for pos, (_xc, items) in zip(col_positions, columns, strict=True)
        for line_no, fret in items
    )
    bar_positions = _place_bars(staff.bars, xs, col_positions)
    width = col_positions[-1] + 2
    return render_system(RenderSystem(labels, width, bar_positions, cells))


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


def _page_words(page: pymupdf.Page) -> list[_Word]:
    return [_Word(w[0], w[1], w[2], w[3], w[4]) for w in page.get_text("words")]


def _line_candidate(line: dict[str, object]) -> tuple[float, float, str] | None:
    spans = line.get("spans")
    if not isinstance(spans, list):
        return None
    line_text = "".join(str(s.get("text", "")) for s in spans if isinstance(s, dict)).strip()
    if not line_text or line_text.lower().startswith(("tuning:", "(based")):
        return None
    max_span = max((float(s.get("size", 0.0)) for s in spans if isinstance(s, dict)), default=0.0)
    bbox = line.get("bbox")
    y0 = float(bbox[1]) if isinstance(bbox, (list, tuple)) and len(bbox) > 1 else 1e9
    return (-max_span, y0, line_text) if y0 < 220.0 else None


def _detect_title(doc: pymupdf.Document, filename: str) -> str:
    blocks = doc[0].get_text("dict").get("blocks", [])
    candidates = [
        cand
        for block in blocks
        if block.get("type") == 0
        for line in block.get("lines", [])
        if (cand := _line_candidate(line)) is not None
    ]
    if candidates:
        _, _, best_text = min(candidates, key=lambda item: (round(item[0], 1), item[1]))
        return unicodedata.normalize("NFKC", best_text)
    return Path(filename).stem if filename else "Imported PDF"


def _clean_pdf_word(text: str) -> str:
    out = []
    for ch in text:
        if ch in _PUA_MAP:
            out.append(_PUA_MAP[ch])
        elif ord(ch) < 0xE000:
            out.append(ch)
    return "".join(out)


def _reconstruct_chord_lines(doc: pymupdf.Document) -> str:
    lines: list[str] = []
    for page in doc:
        cleaned = [
            _Word(w.x0, w.y0, w.x1, w.y1, txt)
            for w in _page_words(page)
            if (txt := _clean_pdf_word(w.text).strip())
        ]
        rows: list[list[_Word]] = []
        for word in sorted(cleaned, key=lambda w: (round(w.yc / 3.0), w.x0)):
            if rows and abs(word.yc - rows[-1][0].yc) <= 3.5:
                rows[-1].append(word)
            else:
                rows.append([word])
        for row in rows:
            ordered = sorted(row, key=lambda w: w.x0)
            parts = [ordered[0].text]
            for prev, nxt in pairwise(ordered):
                sep = "" if nxt.x0 - prev.x1 <= 3.0 else " "
                parts.append(sep + nxt.text)
            lines.append("".join(parts))
    return "\n".join(lines)


def _extract_vector_systems(doc: pymupdf.Document, labels: tuple[str, ...]) -> list[str]:
    rendered: list[str] = []
    for page in doc:
        horz, vert = _collect_segments(page)
        words = _page_words(page)
        for staff in _group_six_line_staves(_merge_y_buckets(horz), vert):
            cols = _cluster_columns(_staff_notes(staff, words))
            if cols:
                rendered.append(_render_staff(staff, cols, labels))
    return rendered


def import_pdf_bytes(data: bytes, filename: str = "") -> ImportedTab:
    """Import a PDF byte buffer as a 6-line ASCII tab (`tab` or expanded `chords`)."""
    try:
        doc = pymupdf.Document(stream=data, filetype="pdf")
    except Exception as err:
        raise ValueError("Could not read PDF file.") from err
    if len(doc) == 0:
        raise ValueError("PDF has no pages.")
    page_texts = [page.get_text("text") for page in doc]
    strings = extract_tuning_from_text(page_texts[0])
    labels = tuple(ascii_name(s) for s in strings) if strings else _GUITAR_LABELS
    title = _detect_title(doc, filename)

    rendered = _extract_vector_systems(doc, labels)
    if rendered:
        return ImportedTab(
            title=title, source="pdf", kind="tab", text="\n\n".join(rendered), strings=strings
        )

    raw_text = "\n".join(page_texts)
    if has_six_line_tab(raw_text):
        return ImportedTab(
            title=title, source="pdf", kind="tab", text=raw_text.strip(), strings=strings
        )

    expanded = expand_chord_sheet(_reconstruct_chord_lines(doc), strings or STANDARD_STRINGS, 0)
    if has_six_line_tab(expanded):
        return ImportedTab(title=title, source="pdf", kind="chords", text=expanded, strings=strings)
    raise ValueError("No 6-line guitar tab or chord sheet found in that PDF.")
