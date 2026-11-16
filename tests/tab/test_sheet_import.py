from pathlib import Path

import pymupdf
import pytest

from fretless.guitar import GUITAR_TUNINGS, fretted_pitch
from fretless.pitch import NoteName, name_to_pitch
from fretless.tab.model import TabSystem
from fretless.tab.parse import parse_tab
from fretless.tab.pdf_geometry import Staff
from fretless.tab.pdf_import import import_pdf_bytes
from fretless.tab.sheet_import import _Glyph, _staff_pitches

STANDARD = GUITAR_TUNINGS["standard"].strings


def _draw_five_line_staff(
    page: pymupdf.Page, y0: float = 120.0, dy: float = 8.0, x0: float = 50.0, x1: float = 450.0
) -> None:
    shape = page.new_shape()
    for i in range(5):
        y = y0 + i * dy
        shape.draw_line(pymupdf.Point(x0, y), pymupdf.Point(x1, y))
    shape.finish(width=0.6)
    shape.commit()


def _draw_vector_notehead(page: pymupdf.Page, cx: float, cy: float) -> None:
    shape = page.new_shape()
    shape.draw_oval(pymupdf.Rect(cx - 3.5, cy - 2.4, cx + 3.5, cy + 2.4))
    shape.finish(color=(0, 0, 0), fill=(0, 0, 0), width=0.5)
    shape.commit()


def _column_pitches(text: str) -> list[list[int]]:
    systems = [b for b in parse_tab(text).blocks if isinstance(b, TabSystem)]
    assert len(systems) >= 1
    out: list[list[int]] = []
    for sys in systems:
        for col in sys.columns:
            pitches = sorted(fretted_pitch(STANDARD[n.line - 1], 0, n.fret) for n in col.notes)
            out.append(pitches)
    return out


def test_import_sheet_music_pdf_with_vector_noteheads_and_chord_stack() -> None:
    doc = pymupdf.Document()
    page = doc.new_page()
    page.insert_text((72, 60), "Treble Scale")
    y0, dy = 120.0, 8.0
    _draw_five_line_staff(page, y0=y0, dy=dy)
    # y4 = y0 + 4 * dy = 152 (E4 = 104); step_y = dy / 2 = 4.0
    # Notes: E4 (104), G4 (110), and chord E4+B4 (104, 118)
    _draw_vector_notehead(page, 120.0, y0 + 4 * dy)
    _draw_vector_notehead(page, 170.0, y0 + 3 * dy)
    _draw_vector_notehead(page, 230.0, y0 + 4 * dy)
    _draw_vector_notehead(page, 230.0, y0 + 2 * dy)

    imported = import_pdf_bytes(doc.tobytes(), filename="treble.pdf", preferred_kind="auto")
    assert imported.kind == "sheet"
    assert _column_pitches(imported.text) == [[104], [110], [104, 118]]


def test_import_sheet_music_honors_barline_and_accidental_reset() -> None:
    doc = pymupdf.Document()
    page = doc.new_page()
    y0, dy = 120.0, 8.0
    _draw_five_line_staff(page, y0=y0, dy=dy)
    # Vector barline splits measures cleanly in the extracted output tab.
    _draw_vector_notehead(page, 120.0, y0 + 4 * dy)
    shape = page.new_shape()
    shape.draw_line(pymupdf.Point(200.0, y0), pymupdf.Point(200.0, y0 + 4 * dy))
    shape.finish(width=0.8)
    shape.commit()
    _draw_vector_notehead(page, 260.0, y0 + 3 * dy)

    imported = import_pdf_bytes(doc.tobytes(), filename="bars.pdf", preferred_kind="sheet")
    assert imported.kind == "sheet"
    systems = [b for b in parse_tab(imported.text).blocks if isinstance(b, TabSystem)]
    assert len(systems[0].bars) == 1
    assert _column_pitches(imported.text) == [[104], [110]]

    # Key flat on B4 (step 4) + sharp measure accidental on F4 (step 1) that resets after bar 200.
    staff = Staff(tuple(y0 + i * dy for i in range(5)), 50.0, 450.0, (200.0,))
    glyphs = [
        _Glyph(70.0, y0 + 3 * dy, 0xE050),  # treble clef
        _Glyph(88.0, y0 + 2 * dy, 0xE260),  # key sig Bb
        _Glyph(112.0, y0 + 3.5 * dy, 0xE262),  # F#4
        _Glyph(120.0, y0 + 3.5 * dy, 0xE0A4),  # note F#4 in bar 1
        _Glyph(150.0, y0 + 3.5 * dy, 0xE0A4),  # still F#4 within bar 1
        _Glyph(180.0, y0 + 2 * dy, 0xE0A4),  # Bb4 from key sig
        _Glyph(220.0, y0 + 3.5 * dy, 0xE0A4),  # back to natural F4 after bar 200
    ]
    pitches, key = _staff_pitches(page, staff, glyphs, {})
    assert key == {"B": -2}
    assert [p for _, p in pitches] == [
        name_to_pitch(NoteName("F", 2, 4)),
        name_to_pitch(NoteName("F", 2, 4)),
        name_to_pitch(NoteName("B", -2, 4)),
        name_to_pitch(NoteName("F", 0, 4)),
    ]


def test_import_sheet_music_on_real_pdfs_when_present() -> None:
    tabs_dir = Path(r"D:\Misc\Tabs")
    if not tabs_dir.exists():
        pytest.skip("Local D:\\Misc\\Tabs folder not present")

    longa_bytes = (tabs_dir / "Longa Riyad - Piano Chords.pdf").read_bytes()
    longa_sheet = import_pdf_bytes(longa_bytes, filename="Longa Riyad.pdf", preferred_kind="auto")
    assert longa_sheet.kind == "sheet"
    pitches = _column_pitches(longa_sheet.text)
    assert len(pitches) >= 200
    # Opening phrase of Longa Riyad in Gm: D5, Bb4, G4, D4, G4, Bb4.
    assert pitches[:6] == [[124], [116], [110], [100], [110], [116]]

    longa_chords = import_pdf_bytes(
        longa_bytes, filename="Longa Riyad.pdf", preferred_kind="chords"
    )
    assert longa_chords.kind == "chords"

    aghdan_bytes = (tabs_dir / "أغدًا ألقاك (صولو الجيتار) - عمر خورشيد.pdf").read_bytes()
    aghdan_sheet = import_pdf_bytes(aghdan_bytes, filename="aghdan.pdf", preferred_kind="sheet")
    assert aghdan_sheet.kind == "sheet"
    assert len(_column_pitches(aghdan_sheet.text)) >= 60
