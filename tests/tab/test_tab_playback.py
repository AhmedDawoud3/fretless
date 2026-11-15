from fretless.guitar import GUITAR_TUNINGS
from fretless.tab.convert import convert
from fretless.tab.convert_model import PlacedNote
from fretless.tab.parse import parse_tab
from fretless.tab.playback import GAP_TICKS, playback
from fretless.tuning import TUNINGS

TEXT = """e|---|
B|---|
G|-0-|
D|---|
A|---|
E|---|

e|--0-|
B|----|
G|----|
D|----|
A|----|
E|----|
"""


def test_ticks_run_on_across_systems_with_a_gap_at_each_break() -> None:
    result = convert(parse_tab(TEXT), GUITAR_TUNINGS["standard"].strings, 0, TUNINGS["cc"])
    first, second = playback(result)
    assert (first.system, first.column, first.tick) == (0, 1, 1)
    assert first.notes == (PlacedNote(2, 0, 86),)
    assert (second.system, second.column) == (1, 2)
    assert second.tick == 2 + 3 + GAP_TICKS  # column + first system's width + one gap
    assert second.notes[0].pitch == 104
