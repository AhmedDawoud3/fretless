from pathlib import Path

import pymupdf
import pytest

from fretless.guitar import GUITAR_TUNINGS
from fretless.maqam_detect import detect_maqam_from_pitches
from fretless.pitch import NoteName, name_to_pitch
from fretless.tab.convert import convert
from fretless.tab.events import note_pitch
from fretless.tab.model import TabSystem
from fretless.tab.parse import parse_tab
from fretless.tab.pdf_geometry import Staff
from fretless.tab.pdf_import import import_pdf_bytes
from fretless.tab.sheet_import import _canonical_code, _Glyph, _staff_pitches, is_any_music_font
from fretless.tuning import TUNINGS

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
            pitches = sorted(note_pitch(STANDARD[n.line - 1], 0, n) for n in col.notes)
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

    essa_path = Path(r"C:\Users\Ahmed Dawoud\Downloads\Documents\EssaJai-Full Score.pdf")
    if essa_path.exists():
        essa_raw = essa_path.read_bytes()
        rh = import_pdf_bytes(essa_raw, filename="EssaJai-Full Score.pdf", preferred_kind="auto")
        assert rh.kind == "sheet"
        assert rh.title == "اسّا جاي"
        assert rh.track_index == 0
        assert len(rh.tracks) == 3
        assert rh.tracks[0].name == "Piano · Right hand"
        assert rh.tracks[1].name == "Piano · Left hand"
        assert rh.tracks[2].name == "Combined (Full score)"
        assert len(_column_pitches(rh.text)) >= 120

        lh = import_pdf_bytes(essa_raw, filename="EssaJai-Full Score.pdf", track=1)
        assert lh.track_index == 1
        assert len(_column_pitches(lh.text)) >= 40

        both = import_pdf_bytes(essa_raw, filename="EssaJai-Full Score.pdf", track=2)
        assert both.track_index == 2
        assert len(_column_pitches(both.text)) >= 120

    awel_path = (
        tabs_dir
        / "انفراد بالنوتة الموسيقية لرائعة روائع فريد الاطرش,,اول همسة_تدوين ماهر الغمرى.pdf"
    )
    if awel_path.exists():
        awel = import_pdf_bytes(awel_path.read_bytes(), filename=awel_path.name)
        assert awel.kind == "sheet"
        systems = [b for b in parse_tab(awel.text).blocks if isinstance(b, TabSystem)]
        assert len(systems) >= 70
        pitches = _column_pitches(awel.text)
        assert sum(len(col) for col in pitches) >= 1200
        # Opening phrase in G Nahawand: D4, D4, Eb4, F4, G4, A4, Bb4, C5, D5.
        assert pitches[:9] == [[100], [100], [102], [106], [110], [114], [116], [120], [124]]
        assert ".5" in awel.text
        flat_pitches = [p for col in pitches for p in col]
        assert sum(p % 2 for p in flat_pitches) >= 40
        converted = convert(parse_tab(awel.text), STANDARD, 0, TUNINGS["cc"])
        assert len(converted.alterations) >= 0
        detected = detect_maqam_from_pitches(flat_pitches)
        assert any(m.maqam_name in {"Nahawand", "Bayati"} and m.root_name == "G" for m in detected)


def test_multitrack_sheet_pdf_groups_connected_staves_into_tracks_and_combined() -> None:
    doc = pymupdf.Document()
    page = doc.new_page()
    page.insert_text((200, 40), "Two-Track Piano", fontsize=18)
    page.insert_text((24, 180), "Piano", fontsize=11)
    y_top, y_bot, dy = 120.0, 200.0, 8.0
    _draw_five_line_staff(page, y0=y_top, dy=dy)
    _draw_five_line_staff(page, y0=y_bot, dy=dy)
    # Left system barline spanning both staves into one grand-staff system.
    shape = page.new_shape()
    shape.draw_line(pymupdf.Point(50.0, y_top), pymupdf.Point(50.0, y_bot + 4 * dy))
    shape.finish(width=0.8)
    shape.commit()
    # Treble notes at x=120, x=200; bass chord note at x=120 (stacked vertically) + x=260.
    _draw_vector_notehead(page, 120.0, y_top + 4 * dy)
    _draw_vector_notehead(page, 200.0, y_top + 3 * dy)
    _draw_vector_notehead(page, 120.0, y_bot + 3 * dy)
    _draw_vector_notehead(page, 260.0, y_bot + 2 * dy)

    raw = doc.tobytes()
    first = import_pdf_bytes(raw, filename="two-track.pdf")
    assert first.kind == "sheet"
    assert first.title == "Two-Track Piano"
    assert first.track_index == 0
    assert [t.name for t in first.tracks] == [
        "Piano · Right hand (1)",
        "Piano · Right hand (2)",
        "Combined (Full score)",
    ]
    assert _column_pitches(first.text) == [[104], [110]]

    second = import_pdf_bytes(raw, filename="two-track.pdf", track=1)
    assert second.track_index == 1
    assert len(_column_pitches(second.text)) == 2

    combined = import_pdf_bytes(raw, filename="two-track.pdf", track=2)
    assert combined.track_index == 2
    assert len(_column_pitches(combined.text)) == 3

    # Legacy OpusStd glyph normalization skips regular text/chord fonts cleanly.
    assert is_any_music_font("OpusStd")
    assert _canonical_code(ord("&"), allow_legacy=True) == 0xE050
    assert _canonical_code(ord("?"), allow_legacy=True) == 0xE062
    assert _canonical_code(ord("œ"), allow_legacy=True) == 0xE0A4
    assert _canonical_code(ord("#"), allow_legacy=True) == 0xE262
    assert _canonical_code(ord("#"), allow_legacy=False) is None


def _draw_box_poly(
    shape: pymupdf.Shape, x0: float, y0: float, x1: float, y1: float, steps: int = 4
) -> None:
    pts = [
        pymupdf.Point(x0, y0),
        pymupdf.Point(x1, y0),
        pymupdf.Point(x1, y1),
        pymupdf.Point(x0, y1),
    ]
    if steps > 4:
        extra = [pymupdf.Point(x0, y1 - (y1 - y0) * i / (steps - 3)) for i in range(1, steps - 3)]
        pts.extend(extra)
    shape.draw_polyline([*pts, pts[0]])


def _draw_compound_flat(
    shape: pymupdf.Shape, cx: float, hole_cy: float, dy: float, half_flat: bool
) -> None:
    w = (1.25 if half_flat else 0.90) * dy
    h = 2.50 * dy
    x0, x1 = cx - w / 2.0, cx + w / 2.0
    y0 = hole_cy - 0.74 * h
    _draw_box_poly(shape, x0, y0, x1, y0 + h)
    shape.draw_oval(
        pymupdf.Rect(cx - 0.18 * dy, hole_cy - 0.25 * dy, cx + 0.18 * dy, hole_cy + 0.25 * dy)
    )


def _draw_compound_quad_accidental(
    shape: pymupdf.Shape, cx: float, hole_cy: float, dy: float, sharp: bool
) -> None:
    w = (1.10 if sharp else 0.70) * dy
    h = 2.80 * dy
    _draw_box_poly(shape, cx - w / 2.0, hole_cy - h / 2.0, cx + w / 2.0, hole_cy + h / 2.0)
    _draw_box_poly(shape, cx - 0.16 * dy, hole_cy - 0.30 * dy, cx + 0.16 * dy, hole_cy + 0.30 * dy)


def test_import_compound_vector_sheet_preserves_quarter_tones_and_ignores_stems() -> None:
    doc = pymupdf.Document()
    page = doc.new_page()
    y0, dy = 120.0, 6.0  # y_bot = 144.0 (E4), step_y = 3.0
    _draw_five_line_staff(page, y0=y0, dy=dy, x0=50.0, x1=450.0)
    # Tall note stem extending past both staff edges must NOT become a barline; x=300 IS a barline.
    lines = page.new_shape()
    lines.draw_line(pymupdf.Point(200.0, y0 - 10.0), pymupdf.Point(200.0, y0 + 4.0 * dy + 3.0))
    lines.draw_line(pymupdf.Point(300.0, y0), pymupdf.Point(300.0, y0 + 4.0 * dy))
    lines.finish(width=0.8)
    lines.commit()

    # One compound filled drawing holding clef, key-sig flat, inline accidentals, and noteheads.
    shape = page.new_shape()
    # Treble clef (w=2.3*dy, h=6.0*dy) on left.
    _draw_box_poly(shape, 58.0, y0 - 6.0, 58.0 + 2.3 * dy, y0 - 6.0 + 6.0 * dy)
    # Key-sig Bb4 (12pt left of first note at x=104 -> tests tight key-sig gap!).
    _draw_compound_flat(shape, 92.0, y0 + 2.0 * dy, dy, half_flat=False)
    # 1) Filled notehead E4 (104) at x=104
    shape.draw_oval(pymupdf.Rect(104.0 - 3.9, 144.0 - 3.0, 104.0 + 3.9, 144.0 + 3.0))
    # 2) Hollow half notehead Bb4 (116, from key sig) at x=140 (outer + inner oval in same drawing)
    shape.draw_oval(pymupdf.Rect(140.0 - 3.9, 132.0 - 3.0, 140.0 + 3.9, 132.0 + 3.0))
    shape.draw_oval(pymupdf.Rect(140.0 - 2.6, 132.0 - 2.0, 140.0 + 2.6, 132.0 + 2.0))
    # 3) Sharp F#4 (108) + notehead at x=180
    _draw_compound_quad_accidental(shape, 171.0, 141.0, dy, sharp=True)
    shape.draw_oval(pymupdf.Rect(180.0 - 3.9, 141.0 - 3.0, 180.0 + 3.9, 141.0 + 3.0))
    # 4) Natural F4 (106) + notehead at x=220
    _draw_compound_quad_accidental(shape, 211.0, 141.0, dy, sharp=False)
    shape.draw_oval(pymupdf.Rect(220.0 - 3.9, 141.0 - 3.0, 220.0 + 3.9, 141.0 + 3.0))
    # 5) Half-flat Ed4 (103) + hollow whole notehead at x=260
    _draw_compound_flat(shape, 251.0, 144.0, dy, half_flat=True)
    shape.draw_oval(pymupdf.Rect(260.0 - 5.7, 144.0 - 3.0, 260.0 + 5.7, 144.0 + 3.0))
    shape.draw_oval(pymupdf.Rect(260.0 - 2.5, 144.0 - 2.2, 260.0 + 2.5, 144.0 + 2.2))
    # 6) After barline (x=300): half-sharp F+4 (107) + notehead at x=340
    _draw_box_poly(shape, 329.0, 141.0 - 7.8, 333.2, 141.0 + 7.8, steps=26)
    shape.draw_oval(pymupdf.Rect(340.0 - 3.9, 141.0 - 3.0, 340.0 + 3.9, 141.0 + 3.0))
    shape.finish(color=None, fill=(0, 0, 0))
    shape.commit()

    imported = import_pdf_bytes(doc.tobytes(), filename="compound-vector.pdf")
    assert imported.kind == "sheet"
    systems = [b for b in parse_tab(imported.text).blocks if isinstance(b, TabSystem)]
    assert len(systems) == 1
    assert len(systems[0].bars) == 1
    assert ".5" in imported.text
    assert _column_pitches(imported.text) == [[104], [116], [108], [106], [103], [107]]
