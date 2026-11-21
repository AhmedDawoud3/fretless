"""Multi-track and grand-staff sheet music system grouping and per-part extraction."""

import unicodedata
from dataclasses import dataclass

import pymupdf

from fretless.pitch import Letter
from fretless.tab.import_model import ImportedTrack
from fretless.tab.pdf_geometry import (
    Staff,
    collect_segments,
    group_staves,
    group_systems,
    merge_y_buckets,
)
from fretless.tab.pdf_vector_glyphs import Glyph
from fretless.tab.sheet_import import (
    _clef_diatonic,
    _staff_pitches,
    extract_nonmusic_line,
    page_sheet_glyphs,
    render_pitch_groups,
)

_MAX_PAGES = 30
_CLEF_LABELS: dict[int, str] = {30: "Treble", 23: "Treble 8vb", 18: "Bass"}
_HAND_LABELS: dict[int, str] = {30: "Right hand", 23: "Right hand", 18: "Left hand"}
_VOCAL_KEYWORDS = ("vocal", "voice", "choir", "singer", "soprano", "alto", "tenor")


@dataclass(frozen=True)
class PageSheetData:
    page: pymupdf.Page
    systems: list[list[Staff]]
    glyphs: list[Glyph]


def _collect_pages(doc: pymupdf.Document) -> list[PageSheetData]:
    pages: list[PageSheetData] = []
    for page in doc[:_MAX_PAGES]:
        horz, vert = collect_segments(page)
        staves = group_staves(merge_y_buckets(horz), vert, line_count=5)
        if staves:
            pages.append(
                PageSheetData(page, group_systems(staves, vert), page_sheet_glyphs(page, staves))
            )
    return pages


def _line_text_if_label(line: dict[object, object], max_x: float) -> tuple[float, str] | None:
    parsed = extract_nonmusic_line(line)
    if parsed is None:
        return None
    raw_text, _, bbox = parsed
    text = unicodedata.normalize("NFKC", raw_text)
    if bbox[2] > max_x + 4.0 or len(text) < 2 or text.isdigit():
        return None
    return (bbox[1] + bbox[3]) / 2.0, text


def _left_margin_labels(page: pymupdf.Page, max_x: float) -> list[tuple[float, str]]:
    blocks = page.get_text("dict").get("blocks", [])
    labels: list[tuple[float, str]] = []
    for block in blocks:
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            if (found := _line_text_if_label(line, max_x)) is not None:
                labels.append(found)
    return labels


def _slot_clef(pages: list[PageSheetData], slot: int) -> int:
    for pg in pages:
        for sys in pg.systems:
            if slot < len(sys):
                st = sys[slot]
                dy = (st.ys[-1] - st.ys[0]) / 4.0
                local = [
                    g
                    for g in pg.glyphs
                    if st.x0 <= g.x <= st.x1 and st.ys[0] - 3.5 * dy <= g.y <= st.ys[-1] + 3.5 * dy
                ]
                return _clef_diatonic(local)
    return 30


def _first_system_with_slot(
    pages: list[PageSheetData], slot: int
) -> tuple[pymupdf.Page, list[Staff]] | None:
    for pg in pages:
        for sys in pg.systems:
            if slot < len(sys):
                return pg.page, sys
    return None


def _slot_track_meta(pages: list[PageSheetData], slot: int) -> ImportedTrack:
    clef = _slot_clef(pages, slot)
    clef_name = _CLEF_LABELS.get(clef, "Treble")
    pair = _first_system_with_slot(pages, slot)
    if pair is None:
        return ImportedTrack(slot, f"Part {slot + 1}", clef_name, False)
    page, sys = pair
    st = sys[slot]
    labels = _left_margin_labels(page, st.x0)
    direct = next((t for y, t in labels if st.ys[0] - 14.0 <= y <= st.ys[-1] + 14.0), None)
    if direct:
        is_vocal = any(k in direct.lower() for k in _VOCAL_KEYWORDS)
        return ImportedTrack(slot, direct, clef_name, is_vocal)
    mid = (st.ys[0] + st.ys[-1]) / 2.0
    shared_candidates = [
        (abs(y - mid), t)
        for y, t in labels
        if sys[0].ys[0] - 12.0 <= y <= sys[-1].ys[-1] + 12.0
        and not any(o.ys[0] - 10.0 <= y <= o.ys[-1] + 10.0 for o in sys)
    ]
    if shared_candidates:
        _, shared = min(shared_candidates, key=lambda item: item[0])
        part = _HAND_LABELS.get(clef, f"Part {slot + 1}")
        return ImportedTrack(slot, f"{shared} · {part}", clef_name, False)
    return ImportedTrack(slot, f"Part {slot + 1}", clef_name, False)


def _extract_slot(
    pages: list[PageSheetData],
    slot: int,
    strings: tuple[int, ...],
    labels: tuple[str, ...],
) -> list[str]:
    rendered: list[str] = []
    active_key: dict[Letter, int] = {}
    for pg in pages:
        for sys in pg.systems:
            if slot >= len(sys):
                continue
            pitches, active_key = _staff_pitches(pg.page, sys[slot], pg.glyphs, active_key)
            if pitches and (text := render_pitch_groups(sys[slot], pitches, strings, labels)):
                rendered.append(text)
    return rendered


def _extract_combined(
    pages: list[PageSheetData],
    strings: tuple[int, ...],
    labels: tuple[str, ...],
) -> list[str]:
    rendered: list[str] = []
    keys: dict[int, dict[Letter, int]] = {}
    for pg in pages:
        for sys in pg.systems:
            combined: list[tuple[float, int]] = []
            for slot, st in enumerate(sys):
                pitches, keys[slot] = _staff_pitches(pg.page, st, pg.glyphs, keys.get(slot, {}))
                combined.extend(pitches)
            if combined and (text := render_pitch_groups(sys[0], combined, strings, labels)):
                rendered.append(text)
    return rendered


def _dedup_track_names(tracks: list[ImportedTrack]) -> list[ImportedTrack]:
    counts: dict[str, int] = {}
    for tr in tracks:
        counts[tr.name] = counts.get(tr.name, 0) + 1
    seen: dict[str, int] = {}
    out: list[ImportedTrack] = []
    for tr in tracks:
        if counts[tr.name] <= 1:
            out.append(tr)
            continue
        idx = seen.get(tr.name, 0) + 1
        seen[tr.name] = idx
        out.append(ImportedTrack(tr.index, f"{tr.name} ({idx})", tr.instrument, tr.is_vocal))
    return out


def extract_multitrack_sheet(
    doc: pymupdf.Document,
    strings: tuple[int, ...],
    labels: tuple[str, ...],
    requested_track: int | None = None,
) -> tuple[list[str], tuple[ImportedTrack, ...], int]:
    """Extract a single track or combined full score from a multi-staff PDF sheet score."""
    pages = _collect_pages(doc)
    n_slots = max((len(sys) for pg in pages for sys in pg.systems), default=0)
    if n_slots == 0:
        return [], (), 0
    if n_slots == 1:
        return _extract_slot(pages, 0, strings, labels), (), 0

    slot_outputs: dict[int, list[str]] = {}
    tracks: list[ImportedTrack] = []
    for slot in range(n_slots):
        out = _extract_slot(pages, slot, strings, labels)
        if out:
            slot_outputs[slot] = out
            tracks.append(_slot_track_meta(pages, slot))
    if not slot_outputs:
        return [], (), 0
    if len(tracks) == 1:
        only_slot = tracks[0].index
        return slot_outputs[only_slot], (), 0

    combined_idx = n_slots
    tracks = _dedup_track_names(tracks)
    tracks.append(ImportedTrack(combined_idx, "Combined (Full score)", "All tracks", False))
    available = {t.index for t in tracks}
    chosen = requested_track if requested_track in available else tracks[0].index
    if chosen == combined_idx:
        return _extract_combined(pages, strings, labels), tuple(tracks), chosen
    return slot_outputs[chosen], tuple(tracks), chosen
