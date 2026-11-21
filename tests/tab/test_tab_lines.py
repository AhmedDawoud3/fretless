import pytest

from fretless.tab.lines import TabLine, parse_tab_line


def test_standard_line_gives_label_and_content_without_closing_bar() -> None:
    assert parse_tab_line("e|-----0-----0-----|-----0--3--|") == TabLine(
        "e", "-----0-----0-----|-----0--3--"
    )


@pytest.mark.parametrize("label", ["E", "B", "Eb", "D#", "a"])
def test_labels(label: str) -> None:
    assert parse_tab_line(f"{label}|--0--|") == TabLine(label, "--0--")


def test_missing_label() -> None:
    assert parse_tab_line("|--0--|") == TabLine("", "--0--")


def test_colon_separator() -> None:
    assert parse_tab_line("e:--0--|") == TabLine("e", "--0--")


def test_double_bar_start_keeps_second_bar_in_content() -> None:
    assert parse_tab_line("e||--0--||") == TabLine("e", "|--0--|")


def test_trailing_spaces_and_comment_after_last_bar_are_dropped() -> None:
    assert parse_tab_line("e|--0--|   ") == TabLine("e", "--0--")
    assert parse_tab_line("e|--0--|  (x2 repeat)") == TabLine("e", "--0--")


def test_no_closing_bar_keeps_everything() -> None:
    assert parse_tab_line("e|--0--1--") == TabLine("e", "--0--1--")


def test_techniques_and_dead_notes_are_content() -> None:
    assert parse_tab_line(r"e|--10-12h14p12-x-/-\-~-|") is not None


def test_quarter_tone_virtual_frets_are_parsed_as_tab_lines() -> None:
    assert parse_tab_line("e|-1.5-11.5-|") == TabLine("e", "-1.5-11.5-")


@pytest.mark.parametrize(
    "text",
    [
        "",
        "Intro",
        "[Verse]   Am        C",
        "e|",
        "e|0|",
        "Am|--0--|",
        "Hello - world | yes",
        "e|--0--w--|",
    ],
)
def test_not_tab_lines(text: str) -> None:
    assert parse_tab_line(text) is None


def test_comment_after_a_double_closing_bar_keeps_the_inner_bar() -> None:
    assert parse_tab_line("e|--0--||  Am") == TabLine("e", "--0--|")
