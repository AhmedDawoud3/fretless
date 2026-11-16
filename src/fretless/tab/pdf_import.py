"""Extract 6-line vector tabs, 5-line sheet music, ASCII tabs, or chord sheets from PDF bytes."""

import re
import unicodedata
from dataclasses import dataclass
from itertools import pairwise
from pathlib import Path

import pymupdf

from fretless.tab.chords import STANDARD_STRINGS, expand_chord_sheet, has_six_line_tab
from fretless.tab.import_model import ImportedTab
from fretless.tab.oud_render import ascii_name
from fretless.tab.pdf_geometry import (
    Staff,
    collect_segments,
    group_staves,
    merge_y_buckets,
    render_quantized_columns,
)
from fretless.tab.sheet_import import extract_sheet_systems
from fretless.tab.tuning_parse import extract_tempo_from_text, extract_tuning_from_text

_PUA_MAP = {"\uf062": "b", "\uf023": "#", "♭": "b", "♯": "#"}
_GUITAR_LABELS = ("e", "B", "G", "D", "A", "E")
_FRET_TECH_RE = re.compile(r"^\(?(\d{1,2})\)?([hp/\\b~]?)$")


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


def _left_guard(staff: Staff, words: list[_Word], dy: float) -> float:
    clefs = [
        w.x1
        for w in words
        if "\ue06d" in w.text
        and w.x0 < staff.x0 + 65.0
        and staff.ys[0] - dy <= w.yc <= staff.ys[-1] + dy
    ]
    return max(staff.x0 + 2.0, max(clefs) + 2.0) if clefs else staff.x0 + 2.0


def _slur_arcs(
    page: pymupdf.Page, staff: Staff, dy: float, min_top: float
) -> list[tuple[float, float, float]]:
    top = max(min_top, staff.ys[0] - 9.0 * dy)
    bottom = staff.ys[-1] + 2.5 * dy
    arcs: list[tuple[float, float, float]] = []
    for drawing in page.get_drawings():
        if not any(it[0] == "c" for it in drawing["items"]):
            continue
        rect = drawing["rect"]
        cy = (rect.y0 + rect.y1) / 2.0
        if 8.0 <= rect.width <= 90.0 and rect.height <= 20.0 and top <= cy <= bottom:
            arcs.append((rect.x0, rect.x1, cy))
    return arcs


def _slide_marks(
    page: pymupdf.Page, staff: Staff, dy: float
) -> list[tuple[float, float, float, str]]:
    top, bottom = staff.ys[0] - dy, staff.ys[-1] + dy
    marks: list[tuple[float, float, float, str]] = []
    for drawing in page.get_drawings():
        for item in drawing["items"]:
            if item[0] != "l":
                continue
            p1, p2 = item[1], item[2]
            dx, d_y = p2.x - p1.x, p2.y - p1.y
            ymid = (p1.y + p2.y) / 2.0
            if 4.0 <= abs(dx) <= 26.0 and 1.5 <= abs(d_y) <= 12.0 and top <= ymid <= bottom:
                slope_up = (d_y < 0) if dx > 0 else (d_y > 0)
                marks.append((min(p1.x, p2.x), max(p1.x, p2.x), ymid, "/" if slope_up else "\\"))
    return marks


def _staff_notes(staff: Staff, words: list[_Word]) -> list[tuple[float, int, int, str]]:
    dy = (staff.ys[-1] - staff.ys[0]) / 5.0
    left = _left_guard(staff, words, dy)
    notes: list[tuple[float, int, int, str]] = []
    for word in words:
        if not (left <= word.xc <= staff.x1 - 1.0):
            continue
        match = _FRET_TECH_RE.fullmatch(word.text.strip())
        if match is None:
            continue
        fret = int(match.group(1))
        if not (0 <= fret <= 24):
            continue
        distances = [(abs(word.yc - sy), idx + 1) for idx, sy in enumerate(staff.ys)]
        best_dist, line_no = min(distances)
        if best_dist <= 0.45 * dy:
            notes.append((word.xc, line_no, fret, match.group(2)))
    return notes


def _matches_arc(
    xc: float,
    nx: float,
    sy: float,
    staff_y0: float,
    dy: float,
    arc: tuple[float, float, float],
) -> bool:
    sx0, sx1, scy = arc
    return sx0 <= xc + 5.0 and sx1 >= nx - 5.0 and (abs(scy - sy) <= 1.8 * dy or scy < staff_y0)


def _matches_slide(
    xc: float, nx: float, sy: float, dy: float, slide: tuple[float, float, float, str]
) -> bool:
    lx0, lx1, ly, _ = slide
    return xc - 2.0 <= lx0 and lx1 <= nx + 2.0 and abs(ly - sy) <= dy


def _note_technique(
    xc: float,
    fret: int,
    inline_tech: str,
    next_note: tuple[float, int, str] | None,
    staff_y0: float,
    sy: float,
    dy: float,
    arcs: list[tuple[float, float, float]],
    slides: list[tuple[float, float, float, str]],
) -> str:
    if inline_tech or next_note is None:
        return inline_tech
    nx, nf, _ = next_note
    if nf != fret and any(_matches_arc(xc, nx, sy, staff_y0, dy, arc) for arc in arcs):
        return "h" if nf > fret else "p"
    return next((s for sl in slides if _matches_slide(xc, nx, sy, dy, sl) for s in [sl[3]]), "")


def _attach_pdf_techniques(
    notes: list[tuple[float, int, int, str]],
    staff: Staff,
    arcs: list[tuple[float, float, float]],
    slides: list[tuple[float, float, float, str]],
) -> list[tuple[float, int, str]]:
    by_line: dict[int, list[tuple[float, int, str]]] = {}
    for xc, line_no, fret, inline_tech in sorted(notes, key=lambda n: (n[1], n[0])):
        by_line.setdefault(line_no, []).append((xc, fret, inline_tech))
    dy = (staff.ys[-1] - staff.ys[0]) / 5.0
    out: list[tuple[float, int, str]] = []
    for line_no, line_list in by_line.items():
        sy = staff.ys[line_no - 1]
        for idx, (xc, fret, tech) in enumerate(line_list):
            nxt = line_list[idx + 1] if idx + 1 < len(line_list) else None
            sym = _note_technique(xc, fret, tech, nxt, staff.ys[0], sy, dy, arcs, slides)
            out.append((xc, line_no, f"{fret}{sym}"))
    return out


def _cluster_columns(
    notes: list[tuple[float, int, str]],
) -> list[tuple[float, list[tuple[int, str]]]]:
    if not notes:
        return []
    ordered = sorted(notes, key=lambda n: (n[0], n[1]))
    groups: list[tuple[float, list[tuple[int, str]]]] = [
        (ordered[0][0], [(ordered[0][1], ordered[0][2])])
    ]
    for xc, line_no, cell in ordered[1:]:
        anchor_x, items = groups[-1]
        if abs(xc - anchor_x) <= 3.5:
            if not any(ln == line_no for ln, _ in items):
                items.append((line_no, cell))
        else:
            groups.append((xc, [(line_no, cell)]))
    return groups


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
        horz, vert = collect_segments(page)
        words = _page_words(page)
        prev_bottom = 0.0
        for staff in group_staves(merge_y_buckets(horz), vert, line_count=6):
            raw_notes = _staff_notes(staff, words)
            if raw_notes:
                dy = (staff.ys[-1] - staff.ys[0]) / 5.0
                tagged = _attach_pdf_techniques(
                    raw_notes,
                    staff,
                    _slur_arcs(page, staff, dy, prev_bottom + 2.0),
                    _slide_lines_wrap(page, staff, dy),
                )
                cols = _cluster_columns(tagged)
                if cols:
                    rendered.append(render_quantized_columns(staff, cols, labels))
            prev_bottom = staff.ys[-1]
    return rendered


def _slide_lines_wrap(
    page: pymupdf.Page, staff: Staff, dy: float
) -> list[tuple[float, float, float, str]]:
    return _slide_marks(page, staff, dy)


def _try_tab_pdf(
    doc: pymupdf.Document,
    page_texts: list[str],
    title: str,
    strings: tuple[int, ...] | None,
    labels: tuple[str, ...],
    tempo: int | None,
) -> ImportedTab | None:
    rendered = _extract_vector_systems(doc, labels)
    if rendered:
        return ImportedTab(
            title=title,
            source="pdf",
            kind="tab",
            text="\n\n".join(rendered),
            strings=strings,
            tempo=tempo,
        )
    raw_text = "\n".join(page_texts)
    if has_six_line_tab(raw_text):
        return ImportedTab(
            title=title,
            source="pdf",
            kind="tab",
            text=raw_text.strip(),
            strings=strings,
            tempo=tempo,
        )
    return None


def _try_sheet_pdf(
    doc: pymupdf.Document,
    title: str,
    strings: tuple[int, ...] | None,
    labels: tuple[str, ...],
    tempo: int | None,
) -> ImportedTab | None:
    sheet = extract_sheet_systems(doc, strings or STANDARD_STRINGS, labels)
    if sheet:
        return ImportedTab(
            title=title,
            source="pdf",
            kind="sheet",
            text="\n\n".join(sheet),
            strings=strings,
            tempo=tempo,
        )
    return None


def _try_chords_pdf(
    doc: pymupdf.Document, title: str, strings: tuple[int, ...] | None, tempo: int | None
) -> ImportedTab | None:
    expanded = expand_chord_sheet(_reconstruct_chord_lines(doc), strings or STANDARD_STRINGS, 0)
    if has_six_line_tab(expanded):
        return ImportedTab(
            title=title, source="pdf", kind="chords", text=expanded, strings=strings, tempo=tempo
        )
    return None


def import_pdf_bytes(data: bytes, filename: str = "", preferred_kind: str = "auto") -> ImportedTab:
    """Import a PDF byte buffer as a 6-line ASCII tab (`tab`, `sheet`, or expanded `chords`)."""
    try:
        doc = pymupdf.Document(stream=data, filetype="pdf")
    except Exception as err:
        raise ValueError("Could not read PDF file.") from err
    if len(doc) == 0:
        raise ValueError("PDF has no pages.")
    page_texts = [page.get_text("text") for page in doc]
    strings = extract_tuning_from_text(page_texts[0])
    tempo = extract_tempo_from_text(page_texts[0])
    labels = tuple(ascii_name(s) for s in strings) if strings else _GUITAR_LABELS
    title = _detect_title(doc, filename)

    attempts = {
        "sheet": [lambda: _try_sheet_pdf(doc, title, strings, labels, tempo)],
        "chords": [lambda: _try_chords_pdf(doc, title, strings, tempo)],
        "tab": [lambda: _try_tab_pdf(doc, page_texts, title, strings, labels, tempo)],
    }.get(
        preferred_kind,
        [
            lambda: _try_tab_pdf(doc, page_texts, title, strings, labels, tempo),
            lambda: _try_sheet_pdf(doc, title, strings, labels, tempo),
            lambda: _try_chords_pdf(doc, title, strings, tempo),
        ],
    )
    for attempt in attempts:
        if (result := attempt()) is not None:
            return result
    raise ValueError("No guitar tab, sheet music, or chord sheet found in that PDF.")
