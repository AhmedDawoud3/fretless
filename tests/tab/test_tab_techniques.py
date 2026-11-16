import pymupdf

from fretless.guitar import GUITAR_TUNINGS
from fretless.tab.columns import line_techniques
from fretless.tab.convert import convert
from fretless.tab.convert_model import PlacedSystem
from fretless.tab.model import TabSystem
from fretless.tab.oud_render import render_converted
from fretless.tab.parse import parse_tab
from fretless.tab.pdf_import import import_pdf_bytes
from fretless.tab.tuning_parse import extract_tempo_from_text
from fretless.tab.url_import import render_songsterr_track
from fretless.tuning import TUNINGS

STANDARD = GUITAR_TUNINGS["standard"].strings
CC = TUNINGS["cc"]


def test_line_techniques_extracts_legato_slides_bends_and_vibrato() -> None:
    content = "--5h7-7p5-5/7-9\\7-7b9-5~--"
    assert line_techniques(content) == {
        2: "h",
        6: "p",
        10: "/",
        14: "\\",
        18: "b",
        22: "~",
    }


def test_parse_convert_and_oud_render_preserve_techniques() -> None:
    tab = "\n".join(
        [
            "e|--5h7p5-5/7--|",
            "B|-------------|",
            "G|-------------|",
            "D|-------------|",
            "A|-------------|",
            "E|-------------|",
        ]
    )
    doc = parse_tab(tab)
    sys = next(b for b in doc.blocks if isinstance(b, TabSystem))
    src_tech = {(line, col): sym for line, col, sym in sys.techniques}
    assert src_tech[(1, 2)] == "h"
    assert src_tech[(1, 4)] == "p"
    assert src_tech[(1, 8)] == "/"

    converted = convert(doc, STANDARD, 0, CC)
    oud_sys = next(b for b in converted.blocks if isinstance(b, PlacedSystem))
    assert any(sym == "h" for _, _, sym in oud_sys.techniques)
    assert any(sym == "p" for _, _, sym in oud_sys.techniques)
    assert any(sym == "/" for _, _, sym in oud_sys.techniques)

    rendered = render_converted(converted, CC, "frets")
    assert "h" in rendered
    assert "p" in rendered
    assert "/" in rendered


def test_songsterr_import_preserves_techniques_tempo_and_beat_durations() -> None:
    track = {
        "tuning": [64, 59, 55, 50, 45, 40],
        "automations": {"tempo": [{"measure": 0, "bpm": 88}]},
        "measures": [
            {
                "voices": [
                    {
                        "beats": [
                            {"duration": [1, 8], "notes": [{"string": 0, "fret": 5, "hp": True}]},
                            {"duration": [1, 8], "notes": [{"string": 0, "fret": 7}]},
                            {
                                "duration": [1, 4],
                                "notes": [{"string": 0, "fret": 5, "slide": "legato"}],
                            },
                            {
                                "duration": [1, 2],
                                "notes": [{"string": 0, "fret": 7, "leftHandVibrato": "wide"}],
                            },
                        ]
                    }
                ]
            }
        ],
    }
    imported = render_songsterr_track(track, title="Solo")
    assert imported.tempo == 88
    sys = next(b for b in parse_tab(imported.text).blocks if isinstance(b, TabSystem))
    assert len(sys.columns) == 4
    tech = {(line, col): sym for line, col, sym in sys.techniques}
    assert tech[(1, sys.columns[0].index)] == "h"
    assert tech[(1, sys.columns[2].index)] == "/"
    assert tech[(1, sys.columns[3].index)] == "~"
    # Eighth (col0->col1) < Quarter (col2->col3) spacing reflects musical beat duration.
    gap_eighth = sys.columns[1].index - sys.columns[0].index
    gap_quarter = sys.columns[3].index - sys.columns[2].index
    assert gap_eighth < gap_quarter


def test_pdf_import_extracts_tempo_slurs_and_inline_techniques() -> None:
    assert extract_tempo_from_text("Moderate ♩ = 120") == 120
    assert extract_tempo_from_text("Adagio\n\ue1d5 = 85") == 85

    doc = pymupdf.Document()
    page = doc.new_page()
    page.insert_text((72, 60), "Tempo Test")
    page.insert_text((72, 80), "♩ = 92")
    y0, dy = 140.0, 8.0
    shape = page.new_shape()
    for i in range(6):
        y = y0 + i * dy
        shape.draw_line(pymupdf.Point(50, y), pymupdf.Point(450, y))
    shape.finish(width=0.6)
    shape.commit()

    # Notes on string 1 (y=140): fret 5 at x=100, fret 7 at x=140, fret 5 at x=180
    page.insert_text((100, y0 + 3), "5", fontsize=8)
    page.insert_text((140, y0 + 3), "7", fontsize=8)
    page.insert_text((180, y0 + 3), "5", fontsize=8)
    # Draw slur curve between x=102 and x=142 just above string 1
    slur = page.new_shape()
    slur.draw_bezier(
        pymupdf.Point(102, y0 - 2),
        pymupdf.Point(115, y0 - 8),
        pymupdf.Point(129, y0 - 8),
        pymupdf.Point(142, y0 - 2),
    )
    slur.finish(width=0.5)
    slur.commit()

    imported = import_pdf_bytes(doc.tobytes(), filename="slur.pdf")
    assert imported.tempo == 92
    sys = next(b for b in parse_tab(imported.text).blocks if isinstance(b, TabSystem))
    tech = {(line, col): sym for line, col, sym in sys.techniques}
    assert tech[(1, sys.columns[0].index)] == "h"
