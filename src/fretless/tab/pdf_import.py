"""Extract 6-line vector tabs, 5-line sheet music, ASCII tabs, or chord sheets from PDF bytes."""

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
from fretless.tab.tuning_parse import extract_tuning_from_text

_PUA_MAP = {"\uf062": "b", "\uf023": "#", "♭": "b", "♯": "#"}
_GUITAR_LABELS = ("e", "B", "G", "D", "A", "E")


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


def _staff_notes(staff: Staff, words: list[_Word]) -> list[tuple[float, int, int]]:
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
        for staff in group_staves(merge_y_buckets(horz), vert, line_count=6):
            cols = _cluster_columns(_staff_notes(staff, words))
            if cols:
                rendered.append(render_quantized_columns(staff, cols, labels))
    return rendered


def _try_tab_pdf(
    doc: pymupdf.Document,
    page_texts: list[str],
    title: str,
    strings: tuple[int, ...] | None,
    labels: tuple[str, ...],
) -> ImportedTab | None:
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
    return None


def _try_sheet_pdf(
    doc: pymupdf.Document, title: str, strings: tuple[int, ...] | None, labels: tuple[str, ...]
) -> ImportedTab | None:
    sheet = extract_sheet_systems(doc, strings or STANDARD_STRINGS, labels)
    if sheet:
        return ImportedTab(
            title=title, source="pdf", kind="sheet", text="\n\n".join(sheet), strings=strings
        )
    return None


def _try_chords_pdf(
    doc: pymupdf.Document, title: str, strings: tuple[int, ...] | None
) -> ImportedTab | None:
    expanded = expand_chord_sheet(_reconstruct_chord_lines(doc), strings or STANDARD_STRINGS, 0)
    if has_six_line_tab(expanded):
        return ImportedTab(title=title, source="pdf", kind="chords", text=expanded, strings=strings)
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
    labels = tuple(ascii_name(s) for s in strings) if strings else _GUITAR_LABELS
    title = _detect_title(doc, filename)

    attempts = {
        "sheet": [lambda: _try_sheet_pdf(doc, title, strings, labels)],
        "chords": [lambda: _try_chords_pdf(doc, title, strings)],
        "tab": [lambda: _try_tab_pdf(doc, page_texts, title, strings, labels)],
    }.get(
        preferred_kind,
        [
            lambda: _try_tab_pdf(doc, page_texts, title, strings, labels),
            lambda: _try_sheet_pdf(doc, title, strings, labels),
            lambda: _try_chords_pdf(doc, title, strings),
        ],
    )
    for attempt in attempts:
        if (result := attempt()) is not None:
            return result
    raise ValueError("No guitar tab, sheet music, or chord sheet found in that PDF.")
