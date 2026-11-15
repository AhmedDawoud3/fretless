from fretless.guitar import GUITAR_TUNINGS
from fretless.tab.convert import convert
from fretless.tab.convert_model import PlacedNote
from fretless.tab.oud_render import (
    ascii_name,
    cell_text,
    course_labels,
    fret_text,
    render_converted,
)
from fretless.tab.parse import parse_tab
from fretless.tuning import TUNINGS

STANDARD = GUITAR_TUNINGS["standard"].strings
CC, FF = TUNINGS["cc"], TUNINGS["ff"]
G_OPEN = "e|---|\nB|---|\nG|-0-|\nD|---|\nA|---|\nE|---|"


def test_labels_are_each_courses_open_note_top_to_bottom() -> None:
    assert course_labels(CC) == ("C", "G", "D", "A", "F", "C")
    assert course_labels(FF) == ("F", "C", "G", "D", "A", "F")


def test_names_use_ascii_accidentals() -> None:
    pitches = (96, 97, 98, 99, 100, 106, 92, 94)
    assert [ascii_name(p) for p in pitches] == ["C", "C+", "C#", "Dd", "D", "F", "Bb", "B"]


def test_virtual_frets_print_whole_or_half() -> None:
    assert [fret_text(p) for p in (0, 1, 6, 7, 24)] == ["0", "0.5", "3", "3.5", "12"]


def test_cell_text_per_mode() -> None:
    note = PlacedNote(1, 8, 104)  # E4 at virtual fret 4
    assert cell_text(note, "frets") == "4"
    assert cell_text(note, "names") == "E"
    assert cell_text(note, "both") == "4(E)"
    assert cell_text(PlacedNote(1, 7, 103), "both") == "3.5(Ed)"


def test_rendered_oud_tab_has_course_labels_and_frets() -> None:
    result = convert(parse_tab(G_OPEN), STANDARD, 0, CC)
    assert render_converted(result, CC, "frets") == "\n".join(
        ["C|---|", "G|-0-|", "D|---|", "A|---|", "F|---|", "C|---|"]
    )
    assert "G|-G-|" in render_converted(result, CC, "names")
    assert "G|-0(G)|" in render_converted(result, CC, "both")


def test_text_blocks_come_out_verbatim_between_systems() -> None:
    result = convert(parse_tab(f"Intro\n{G_OPEN}\nOutro"), STANDARD, 0, CC)
    out = render_converted(result, CC, "frets")
    assert out.startswith("Intro\nC|---|")
    assert out.endswith("C|---|\nOutro")
