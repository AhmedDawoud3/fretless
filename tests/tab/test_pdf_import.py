from pathlib import Path

import pymupdf
import pytest

from fretless.tab.model import TabSystem
from fretless.tab.parse import parse_tab
from fretless.tab.pdf_import import import_pdf_bytes
from fretless.tab.tuning_parse import parse_tuning_spec


def _make_vector_tab_pdf() -> bytes:
    doc = pymupdf.Document()
    page = doc.new_page()
    page.insert_text((200, 50), "Smile Test")
    page.insert_text((200, 70), "Tuning: DGBDGA")
    y0, dy = 140.0, 8.0
    shape = page.new_shape()
    for i in range(6):
        y = y0 + i * dy
        shape.draw_line(pymupdf.Point(50, y), pymupdf.Point(450, y))
    shape.draw_line(pymupdf.Point(250, y0), pymupdf.Point(250, y0 + 5 * dy))
    shape.finish(width=0.6)
    shape.commit()
    # String 1 (y=140) fret 12, string 3 (y=156) fret 0, string 6 (y=180) fret 5
    page.insert_text((100, y0 + 3), "12", fontsize=8)
    page.insert_text((160, y0 + 2 * dy + 3), "0", fontsize=8)
    page.insert_text((300, y0 + 5 * dy + 3), "5", fontsize=8)
    return doc.tobytes()


def _make_chord_pdf() -> bytes:
    doc = pymupdf.Document()
    page = doc.new_page()
    page.insert_text((72, 72), "My Song")
    page.insert_text((72, 110), "Gm  Gm  D7  Gm")
    page.insert_text((72, 130), "Cm  Gm  F   Eb")
    return doc.tobytes()


def test_import_pdf_extracts_vector_six_line_tab_and_tuning() -> None:
    imported = import_pdf_bytes(_make_vector_tab_pdf(), filename="smile.pdf")
    assert imported.title == "Smile Test"
    assert imported.kind == "tab"
    assert imported.strings == parse_tuning_spec("DGBDGA")
    systems = [b for b in parse_tab(imported.text).blocks if isinstance(b, TabSystem)]
    assert len(systems) == 1
    sys = systems[0]
    assert sys.lines == 6
    notes = [(n.line, n.fret) for col in sys.columns for n in col.notes]
    assert (1, 12) in notes
    assert (3, 0) in notes
    assert (6, 5) in notes


def test_import_pdf_expands_chord_sheet_pdfs() -> None:
    imported = import_pdf_bytes(_make_chord_pdf(), filename="longa.pdf")
    assert imported.kind == "chords"
    systems = [b for b in parse_tab(imported.text).blocks if isinstance(b, TabSystem)]
    assert len(systems) == 1
    assert len(systems[0].columns) == 8


def test_import_pdf_rejects_corrupt_bytes() -> None:
    with pytest.raises(ValueError, match="PDF"):
        import_pdf_bytes(b"not a pdf", filename="bad.pdf")


def test_import_pdf_works_on_sample_local_tabs_when_present() -> None:
    tabs_dir = Path(r"D:\Misc\Tabs")
    if not tabs_dir.exists():
        pytest.skip("Local D:\\Misc\\Tabs folder not present")
    samples = [
        ("Smile - Tamino.pdf", "tab", parse_tuning_spec("DGBDGA")),
        ("Willow - Tamino.pdf", "tab", parse_tuning_spec("CFCGCD")),
        ("أغدًا ألقاك (صولو الجيتار) - عمر خورشيد.pdf", "tab", None),
        ("خلي بالك من عقلك - عمر خيرت.pdf", "tab", None),
        ("Longa Riyad - Piano Chords.pdf", "chords", None),
    ]
    for name, expected_kind, expected_strings in samples:
        imported = import_pdf_bytes((tabs_dir / name).read_bytes(), filename=name)
        assert imported.kind == expected_kind
        if expected_strings is not None:
            assert imported.strings == expected_strings
        systems = [b for b in parse_tab(imported.text).blocks if isinstance(b, TabSystem)]
        assert len(systems) >= 1
        assert sum(len(c.notes) for s in systems for c in s.columns) > 10
