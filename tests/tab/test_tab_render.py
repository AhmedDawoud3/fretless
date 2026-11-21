from hypothesis import assume, given, settings
from hypothesis import strategies as st

from fretless.tab.model import Column, TabDocument, TabNote, TabSystem, TextBlock
from fretless.tab.parse import parse_tab
from fretless.tab.render import render_document, render_system, to_render_system
from fretless.tab.render_model import RenderCell, RenderSystem

LABELS = ("e", "B", "G", "D")


def test_render_system_prints_labels_bars_cells_and_closing_bar() -> None:
    system = RenderSystem(LABELS, 8, (4,), (RenderCell(1, 1, "3"), RenderCell(4, 5, "12")))
    assert render_system(system) == "\n".join(
        ["e|-3--|---|", "B|----|---|", "G|----|---|", "D|----|12-|"]
    )


def test_labels_are_right_padded_to_equal_width() -> None:
    system = RenderSystem(("e", "B", "G", "Eb"), 3, (), ())
    assert render_system(system).split("\n") == ["e |---|", "B |---|", "G |---|", "Eb|---|"]


def test_widening_keeps_every_line_aligned() -> None:
    system = RenderSystem(LABELS, 6, (2,), (RenderCell(1, 0, "123"), RenderCell(3, 3, "5")))
    assert render_system(system).split("\n") == [
        "e|123|---|",
        "B|---|---|",
        "G|---|5--|",
        "D|---|---|",
    ]


def test_render_document_joins_text_and_systems_in_order() -> None:
    system = RenderSystem(LABELS, 3, (), ())
    text = "Intro\n" + render_system(system) + "\n\nOutro"
    assert text == render_document((TextBlock("Intro"), system, TextBlock("\nOutro")))


def test_to_render_system_prints_fret_numbers() -> None:
    tab = TabSystem(4, 6, (3,), (Column(1, (TabNote(2, 12), TabNote(4, 0))),), LABELS)
    assert to_render_system(tab) == RenderSystem(
        LABELS, 6, (3,), (RenderCell(2, 1, "12"), RenderCell(4, 1, "0"))
    )


@st.composite
def tab_systems(draw: st.DrawFn) -> TabSystem:
    lines = draw(st.integers(4, 7))
    width = draw(st.integers(12, 40))
    bars = tuple(sorted(draw(st.sets(st.integers(0, width - 1), max_size=3))))
    indexes = sorted(draw(st.sets(st.integers(0, width - 1), min_size=1, max_size=10)))
    frets = st.integers(0, 24)
    columns = tuple(
        Column(
            index,
            tuple(
                TabNote(line, draw(frets))
                for line in sorted(draw(st.sets(st.integers(1, lines), min_size=1)))
            ),
        )
        for index in indexes
    )
    labels = tuple(
        draw(st.sampled_from(["", "e", "B", "G", "D", "A", "E", "Eb", "D#"])) for _ in range(lines)
    )
    return TabSystem(lines, width, bars, columns, labels)


def _notes(system: TabSystem) -> list[list[tuple[int, int]]]:
    return [[(n.line, n.fret) for n in c.notes] for c in system.columns]


@settings(max_examples=300)
@given(tab_systems())
def test_render_then_parse_round_trips(system: TabSystem) -> None:
    text = render_system(to_render_system(system))
    lines = text.split("\n")
    assert len(lines) == system.lines
    assert len({len(line) for line in lines}) == 1
    assume(all(line.count("-") >= 2 for line in lines))  # else it does not look like tab
    (parsed,) = parse_tab(text).blocks
    assert isinstance(parsed, TabSystem)
    assert parsed.lines == system.lines
    assert parsed.labels == system.labels
    assert _notes(parsed) == _notes(system)
    assert len(parsed.bars) == len(system.bars)
    if parsed.width == system.width:  # no widening was needed
        assert parsed.bars == system.bars
        assert [c.index for c in parsed.columns] == [c.index for c in system.columns]


def test_document_round_trip_of_text() -> None:
    doc = TabDocument((TextBlock("a\nb"),))
    assert parse_tab(render_document(doc.blocks)) == doc


def test_document_round_trip_keeps_systems_and_text() -> None:
    system = RenderSystem(LABELS, 6, (3,), (RenderCell(2, 1, "12"),))
    text = "Intro\n" + render_system(system) + "\nEnd"
    assert render_document(parse_tab(text).blocks) == text


def test_half_fret_notes_render_and_round_trip() -> None:
    tab = TabSystem(4, 8, (4,), (Column(1, (TabNote(1, 2, half=True), TabNote(3, 0))),), LABELS)
    text = render_system(to_render_system(tab))
    assert "2.5" in text
    (parsed,) = parse_tab(text).blocks
    assert isinstance(parsed, TabSystem)
    assert parsed.columns[0].notes == (TabNote(1, 2, half=True), TabNote(3, 0))
