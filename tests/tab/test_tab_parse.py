from fretless.tab.model import Column, TabNote, TabSystem, TextBlock
from fretless.tab.parse import parse_tab

SAMPLE = """Intro
e|-----0-----0-----|-----0--3--|
B|---1-----1-------|---1-------|
G|-0-----0---------|-0---------|
D|-----------------|-----------|
A|-3---------------|-3---------|
E|-----------------|-----------|

[Verse]   Am        C
e|--0--------0--|--10-12h14p12--|
B|--1--------1--|---------------|
G|--2--------0--|---------------|
D|--2--------2--|---------------|
A|--0--------3--|---------------|
E|-----------x--|---------------|
"""
LABELS = ("e", "B", "G", "D", "A", "E")


def _system(text: str) -> TabSystem:
    (block,) = [b for b in parse_tab(text).blocks if isinstance(b, TabSystem)]
    return block


def test_sample_structure_and_text_blocks_in_order() -> None:
    blocks = parse_tab(SAMPLE).blocks
    assert [type(b) for b in blocks] == [TextBlock, TabSystem, TextBlock, TabSystem, TextBlock]
    assert blocks[0] == TextBlock("Intro")
    assert blocks[2] == TextBlock("\n[Verse]   Am        C")
    assert blocks[4] == TextBlock("")


def test_first_system() -> None:
    first = parse_tab(SAMPLE).blocks[1]
    assert isinstance(first, TabSystem)
    assert (first.lines, first.width, first.bars, first.labels) == (6, 29, (17,), LABELS)
    assert first.columns == (
        Column(1, (TabNote(3, 0), TabNote(5, 3))),
        Column(3, (TabNote(2, 1),)),
        Column(5, (TabNote(1, 0),)),
        Column(7, (TabNote(3, 0),)),
        Column(9, (TabNote(2, 1),)),
        Column(11, (TabNote(1, 0),)),
        Column(19, (TabNote(3, 0), TabNote(5, 3))),
        Column(21, (TabNote(2, 1),)),
        Column(23, (TabNote(1, 0),)),
        Column(26, (TabNote(1, 3),)),
    )


def test_second_system_has_chords_techniques_and_dead_note() -> None:
    second = parse_tab(SAMPLE).blocks[3]
    assert isinstance(second, TabSystem)
    assert (second.width, second.bars) == (30, (14,))
    assert second.columns == (
        Column(2, tuple(TabNote(i + 1, f) for i, f in enumerate((0, 1, 2, 2, 0)))),
        Column(11, tuple(TabNote(i + 1, f) for i, f in enumerate((0, 1, 0, 2, 3)))),
        Column(17, (TabNote(1, 10),)),
        Column(20, (TabNote(1, 12),)),
        Column(23, (TabNote(1, 14),)),
        Column(26, (TabNote(1, 12),)),
    )


def test_unequal_line_lengths_are_padded() -> None:
    system = _system("e|--0--|\nB|--1-----|\nG|--2|\nD|--0--|\n")
    assert system.width == 8
    assert system.lines == 4


def test_crlf() -> None:
    assert parse_tab(SAMPLE.replace("\n", "\r\n")) == parse_tab(SAMPLE)


def test_missing_labels_double_bars_and_trailing_comment() -> None:
    system = _system("||--0--||  Am\n||--1--||\n||--2--||\n||--3--||\n")
    assert system.labels == ("", "", "", "")
    assert system.bars == (0, 6)
    assert system.width == 7


def test_text_without_tab_is_one_text_block() -> None:
    assert parse_tab("hello\nworld").blocks == (TextBlock("hello\nworld"),)


def test_empty_text_is_an_empty_document() -> None:
    assert parse_tab("").blocks == ()


def test_lone_tab_looking_line_is_text() -> None:
    text = "e|--0--|\nsome words"
    assert parse_tab(text).blocks == (TextBlock(text),)


def test_runs_of_three_or_eight_lines_are_text() -> None:
    for count in (3, 8):
        text = "\n".join(["e|--0--|"] * count)
        assert parse_tab(text).blocks == (TextBlock(text),)


def test_seven_string_system_is_accepted() -> None:
    assert _system("\n".join(["e|--0--|"] * 7)).lines == 7


def test_never_raises_on_arbitrary_text() -> None:
    parse_tab("|\n||\n:\n\x00\n-|-|-")


def test_rejected_run_after_a_system_joins_the_text_around_it() -> None:
    system = "\n".join(["e|--0--|"] * 4)
    short = "\n".join(["e|--0--|"] * 3)
    text = f"{system}\nwords\n{short}\nmore"
    assert parse_tab(text).blocks == (
        parse_tab(system).blocks[0],
        TextBlock(f"words\n{short}\nmore"),
    )
