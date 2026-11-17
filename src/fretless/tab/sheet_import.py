"""Extract 5-line standard sheet music notation staves from PDFs into 6-line guitar tab."""

from dataclasses import dataclass

import pymupdf

from fretless.pitch import LETTERS, STEPS_PER_OCTAVE, Letter, NoteName, name_to_pitch
from fretless.tab.pdf_geometry import (
    Staff,
    collect_segments,
    group_staves,
    merge_y_buckets,
    render_quantized_columns,
)

_MUSIC_FONT_KEYS = (
    "opus",
    "bravura",
    "leland",
    "maestro",
    "petrucci",
    "helsinki",
    "inkpen",
    "feta",
    "sonata",
    "engraver",
    "jazz",
    "edwin",
)
_NON_NOTATION_SUFFIXES = ("chord", "text", "special")

_SMUFL_CLEFS: dict[int, int] = {
    0xE050: 30,  # Treble G clef: bottom line E4
    0xF026: 30,
    0xE052: 23,  # Treble 8vb clef: bottom line E3
    0xE062: 18,  # Bass F clef: bottom line G2
    0xF03F: 18,
}
_HEAD_CODES = frozenset({0xE0A0, 0xE0A2, 0xE0A3, 0xE0A4, 0xF0CF, 0xF0FA, 0xF077})
_ACCIDENTAL_STEPS: dict[int, int] = {
    0xE260: -2,
    0xF062: -2,
    0xE261: 0,
    0xF06E: 0,
    0xE262: 2,
    0xF023: 2,
    0xE280: -1,
    0xE284: -1,
    0xE480: -1,
    0xE282: 1,
    0xE482: 1,
}
_LEGACY_REMAP: dict[int, int] = {
    0x26: 0xE050,  # '&' Treble clef
    0x3F: 0xE062,  # '?' Bass clef
    0x153: 0xE0A4,  # 'œ' filled notehead
    0x2D9: 0xE0A3,  # '˙' half notehead
    0x77: 0xE0A2,  # 'w' whole notehead
    0x57: 0xE0A2,  # 'W' whole notehead
    0x23: 0xE262,  # '#' sharp
    0x62: 0xE260,  # 'b' flat
    0x6E: 0xE261,  # 'n' natural
}


def is_any_music_font(font: str) -> bool:
    """Return True if `font` is a music symbol, notation, brace, or chord-symbol font."""
    low = font.lower()
    return any(key in low for key in _MUSIC_FONT_KEYS)


def _line_spans(raw: object) -> list[dict[object, object]]:
    if not isinstance(raw, list):
        return []
    return [s for s in raw if isinstance(s, dict)]


def _span_size(raw: object) -> float:
    return float(raw) if isinstance(raw, int | float) else 0.0


def extract_nonmusic_line(
    line: dict[object, object],
) -> tuple[str, float, tuple[float, float, float, float]] | None:
    """Return `(text, max_font_size, bbox)` for a PDF dict line outside music fonts."""
    spans = _line_spans(line.get("spans"))
    raw_bbox = line.get("bbox")
    if not spans or not isinstance(raw_bbox, (list, tuple)) or len(raw_bbox) < 4:
        return None
    if all(is_any_music_font(str(s.get("font", ""))) for s in spans):
        return None
    text = "".join(str(s.get("text", "")) for s in spans).strip()
    if not any(ch.isalnum() for ch in text):
        return None
    size = max(_span_size(s.get("size", 0.0)) for s in spans)
    return (
        text,
        size,
        (float(raw_bbox[0]), float(raw_bbox[1]), float(raw_bbox[2]), float(raw_bbox[3])),
    )


def _is_notation_font(font: str) -> bool:
    low = font.lower()
    return is_any_music_font(low) and not any(part in low for part in _NON_NOTATION_SUFFIXES)


def _canonical_code(raw_code: int, allow_legacy: bool) -> int | None:
    code = _LEGACY_REMAP.get(raw_code, raw_code) if allow_legacy else raw_code
    if code in _HEAD_CODES or code in _ACCIDENTAL_STEPS or code in _SMUFL_CLEFS:
        return code
    return None


@dataclass(frozen=True)
class _Glyph:
    x: float
    y: float
    code: int


def _page_glyphs(page: pymupdf.Page) -> list[_Glyph]:
    glyphs: list[_Glyph] = []
    raw = page.get_text("rawdict")
    for block in raw.get("blocks", []):
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                allow_legacy = _is_notation_font(str(span.get("font", "")))
                for char in span.get("chars", []):
                    if (code := _canonical_code(ord(char["c"]), allow_legacy)) is not None:
                        ox, oy = char["origin"]
                        glyphs.append(_Glyph(float(ox), float(oy), code))
    return glyphs


def _vector_noteheads(page: pymupdf.Page, staff: Staff, dy: float) -> list[_Glyph]:
    top, bottom = staff.ys[0] - 3.5 * dy, staff.ys[-1] + 3.5 * dy
    heads: list[_Glyph] = []
    for drawing in page.get_drawings():
        if not any(it[0] == "c" for it in drawing["items"]):
            continue
        if drawing.get("fill") is None and drawing.get("color") is None:
            continue
        rect = drawing["rect"]
        cx, cy = (rect.x0 + rect.x1) / 2.0, (rect.y0 + rect.y1) / 2.0
        if (
            3.0 <= rect.width <= 12.0
            and 2.5 <= rect.height <= 9.0
            and staff.x0 + 6.0 <= cx <= staff.x1 - 2.0
            and top <= cy <= bottom
        ):
            heads.append(_Glyph(cx, cy, 0xE0A4))
    return heads


def _fold_into_guitar_range(pitch: int, low: int, high: int) -> int:
    while pitch < low:
        pitch += STEPS_PER_OCTAVE
    while pitch > high:
        pitch -= STEPS_PER_OCTAVE
    return pitch


def note_candidates(pitch: int, strings: tuple[int, ...]) -> list[tuple[int, int]]:
    even_pitch = round(pitch / 2) * 2
    low, high = min(strings), max(strings) + 48
    fitted = _fold_into_guitar_range(even_pitch, low, high)
    opts: list[tuple[int, int]] = []
    for line_no, open_pitch in enumerate(strings, start=1):
        diff = fitted - open_pitch
        if diff % 2 == 0 and 0 <= diff // 2 <= 24:
            opts.append((line_no, diff // 2))
    opts.sort(key=lambda item: (0 if item[1] <= 7 else 20 + item[1], item[1], item[0]))
    return opts


def _place_pitch_column(pitches: list[int], strings: tuple[int, ...]) -> list[tuple[int, int]]:
    placed: list[tuple[int, int]] = []
    used_lines: set[int] = set()
    for pitch in sorted(pitches, reverse=True):
        choice = next(
            (cand for cand in note_candidates(pitch, strings) if cand[0] not in used_lines),
            None,
        )
        if choice is not None:
            used_lines.add(choice[0])
            placed.append(choice)
    return sorted(placed)


def _cluster_x_columns(notes: list[tuple[float, int]]) -> list[tuple[float, list[int]]]:
    if not notes:
        return []
    ordered = sorted(notes, key=lambda n: (n[0], n[1]))
    groups: list[tuple[float, list[int]]] = [(ordered[0][0], [ordered[0][1]])]
    for xc, pitch in ordered[1:]:
        anchor_x, items = groups[-1]
        if abs(xc - anchor_x) <= 3.5:
            items.append(pitch)
        else:
            groups.append((xc, [pitch]))
    return groups


def _clef_diatonic(staff_glyphs: list[_Glyph]) -> int:
    clefs = [g for g in staff_glyphs if g.code in _SMUFL_CLEFS]
    if not clefs:
        return 30
    first = min(clefs, key=lambda g: g.x)
    return _SMUFL_CLEFS[first.code]


def _accidental_for_note(
    note: _Glyph,
    step: int,
    step_y: float,
    inline_accs: list[tuple[_Glyph, int]],
    used: set[int],
) -> int | None:
    best: tuple[float, int, int] | None = None
    for idx, (acc, acc_step) in enumerate(inline_accs):
        if idx in used or acc_step != step:
            continue
        dx = note.x - acc.x
        if 0.0 < dx <= 16.0 and abs(acc.y - note.y) <= 1.2 * step_y:
            cand = (dx, idx, _ACCIDENTAL_STEPS[acc.code])
            if best is None or cand[0] < best[0]:
                best = cand
    if best is None:
        return None
    used.add(best[1])
    return best[2]


def _is_key_sig_acc(
    acc: _Glyph,
    heads: list[_Glyph],
    first_note_x: float,
    y_bottom: float,
    step_y: float,
) -> bool:
    if acc.x >= first_note_x - 14.0:
        return False
    step = round((y_bottom - acc.y) / step_y)
    return not any(
        0.0 < h.x - acc.x <= 15.0 and round((y_bottom - h.y) / step_y) == step for h in heads
    )


def _extract_key_signature(
    accs: list[_Glyph],
    heads: list[_Glyph],
    base_diatonic: int,
    y_bottom: float,
    step_y: float,
    prev_key: dict[Letter, int],
) -> tuple[dict[Letter, int], list[tuple[_Glyph, int]]]:
    first_note_x = min(h.x for h in heads)
    key_accs = [a for a in accs if _is_key_sig_acc(a, heads, first_note_x, y_bottom, step_y)]
    key_alter: dict[Letter, int] = (
        {
            LETTERS[(base_diatonic + round((y_bottom - a.y) / step_y)) % 7]: _ACCIDENTAL_STEPS[
                a.code
            ]
            for a in key_accs
        }
        if key_accs
        else dict(prev_key)
    )
    key_objs = {id(a) for a in key_accs}
    inline_accs = [
        (acc, round((y_bottom - acc.y) / step_y)) for acc in accs if id(acc) not in key_objs
    ]
    return key_alter, inline_accs


def _resolve_head_pitches(
    heads: list[_Glyph],
    staff_bars: tuple[float, ...],
    base_diatonic: int,
    y_bottom: float,
    step_y: float,
    key_alter: dict[Letter, int],
    inline_accs: list[tuple[_Glyph, int]],
) -> list[tuple[float, int]]:
    used_acc: set[int] = set()
    measure_alter: dict[int, int] = {}
    bars = iter(staff_bars)
    next_bar = next(bars, float("inf"))
    pitches: list[tuple[float, int]] = []
    for head in sorted(heads, key=lambda h: h.x):
        while head.x >= next_bar:
            measure_alter.clear()
            next_bar = next(bars, float("inf"))
        step = round((y_bottom - head.y) / step_y)
        if (
            explicit := _accidental_for_note(head, step, step_y, inline_accs, used_acc)
        ) is not None:
            measure_alter[step] = explicit
        diatonic = base_diatonic + step
        letter = LETTERS[diatonic % 7]
        alter = measure_alter.get(step, key_alter.get(letter, 0))
        pitches.append((head.x, name_to_pitch(NoteName(letter, alter, diatonic // 7))))
    return pitches


def _staff_pitches(
    page: pymupdf.Page,
    staff: Staff,
    glyphs: list[_Glyph],
    prev_key: dict[Letter, int],
) -> tuple[list[tuple[float, int]], dict[Letter, int]]:
    dy = (staff.ys[-1] - staff.ys[0]) / 4.0
    step_y = (staff.ys[-1] - staff.ys[0]) / 8.0
    top, bottom = staff.ys[0] - 3.5 * dy, staff.ys[-1] + 3.5 * dy
    local = sorted(
        (g for g in glyphs if staff.x0 <= g.x <= staff.x1 and top <= g.y <= bottom),
        key=lambda g: g.x,
    )
    heads = [g for g in local if g.code in _HEAD_CODES] or _vector_noteheads(page, staff, dy)
    if not heads:
        return [], prev_key

    base_diatonic, y_bottom = _clef_diatonic(local), staff.ys[-1]
    key_alter, inline_accs = _extract_key_signature(
        [g for g in local if g.code in _ACCIDENTAL_STEPS],
        heads,
        base_diatonic,
        y_bottom,
        step_y,
        prev_key,
    )
    pitches = _resolve_head_pitches(
        heads, staff.bars, base_diatonic, y_bottom, step_y, key_alter, inline_accs
    )
    return pitches, key_alter


def render_pitch_groups(
    staff: Staff,
    pitches: list[tuple[float, int]],
    strings: tuple[int, ...],
    labels: tuple[str, ...],
) -> str | None:
    """Cluster `(x, pitch)` items into fretboard columns and render one tab system."""
    cols = [
        (xc, placed)
        for xc, group in _cluster_x_columns(pitches)
        if (placed := _place_pitch_column(group, strings))
    ]
    return render_quantized_columns(staff, cols, labels) if cols else None


def extract_sheet_systems(
    doc: pymupdf.Document,
    strings: tuple[int, ...],
    labels: tuple[str, ...],
) -> list[str]:
    """Extract 5-line notation staves from `doc` and render each as a 6-line guitar tab."""
    rendered: list[str] = []
    active_key: dict[Letter, int] = {}
    for page in doc[:30]:
        horz, vert = collect_segments(page)
        staves = group_staves(merge_y_buckets(horz), vert, line_count=5)
        glyphs = _page_glyphs(page)
        for staff in staves:
            pitches, active_key = _staff_pitches(page, staff, glyphs, active_key)
            if pitches and (text := render_pitch_groups(staff, pitches, strings, labels)):
                rendered.append(text)
    return rendered
