from fretless.tab.events import extract_events
from fretless.tab.parse import parse_tab

STANDARD = (104, 94, 86, 76, 66, 56)
TWO = """e|--0--|
B|--1--|
G|--0--|
D|-----|
A|-3---|
E|-----|

e|--5--|
B|-----|
G|-----|
D|-----|
A|-----|
E|-----|
"""


def test_events_are_columns_in_order_with_system_index_and_sounding_pitches() -> None:
    events = extract_events(parse_tab(TWO), STANDARD, capo=0)
    assert [(e.system, e.column) for e in events] == [(0, 1), (0, 2), (1, 2)]
    assert events[0].pitches == (72,)  # A string fret 3 = 66 + 6
    assert events[1].pitches == (104, 96, 86)  # open e, B fret 1, open G: top line first
    assert events[2].pitches == (114,)  # high E string fret 5 = A4


def test_capo_raises_every_note_two_steps_per_fret() -> None:
    plain = extract_events(parse_tab(TWO), STANDARD, capo=0)
    capoed = extract_events(parse_tab(TWO), STANDARD, capo=2)
    assert [e.pitches for e in capoed] == [tuple(p + 4 for p in e.pitches) for e in plain]


def test_only_six_line_systems_become_events_but_all_are_counted() -> None:
    five = "\n".join(["e|--0--|"] * 5)
    six = "\n".join(["e|--0--|"] * 6)
    events = extract_events(parse_tab(f"{five}\n\n{six}"), STANDARD, capo=0)
    assert [(e.system, e.column) for e in events] == [(1, 2)]
