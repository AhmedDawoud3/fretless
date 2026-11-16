import random
import time

from hypothesis import given, settings
from hypothesis import strategies as st

from fretless.guitar import GUITAR_TUNINGS, GuitarTuning, fretted_pitch
from fretless.neck import Location, max_position, pitch_at
from fretless.pitch import STEPS_PER_OCTAVE
from fretless.tab.convert import convert
from fretless.tab.convert_model import PlacedSystem
from fretless.tab.model import TabSystem, TextBlock
from fretless.tab.options import options
from fretless.tab.oud_render import render_converted
from fretless.tab.parse import parse_tab
from fretless.tab.placement import placements
from fretless.tuning import TUNINGS, Tuning

LABELS = "eBGDAE"
fret = st.integers(0, 24)
column = st.lists(st.none() | fret, min_size=6, max_size=6).filter(
    lambda cells: any(c is not None for c in cells)
)


def _text(columns: list[list[int | None]]) -> str:
    """A 6-line system with every column three characters wide."""
    rows = []
    for line, label in enumerate(LABELS):
        cells = "".join(
            "-" + (str(c[line]).ljust(2, "-") if c[line] is not None else "--") for c in columns
        )
        rows.append(f"{label}|{cells}--|")
    return "\n".join(rows)


documents = st.lists(st.lists(column, min_size=1, max_size=8), min_size=1, max_size=3).map(
    lambda systems: "Title\n" + "\n\nbetween\n".join(_text(s) for s in systems) + "\nEnd"
)
setups = st.tuples(
    documents,
    st.sampled_from(list(GUITAR_TUNINGS.values())),
    st.integers(0, 5),
    st.sampled_from(list(TUNINGS.values())),
)


@given(setups)
@settings(max_examples=150, deadline=None)
def test_every_converted_column_is_playable_and_faithful(
    setup: tuple[str, GuitarTuning, int, Tuning],
) -> None:
    text, guitar, capo, tuning = setup
    document = parse_tab(text)
    result = convert(document, guitar.strings, capo, tuning)
    sources = [b for b in document.blocks if isinstance(b, TabSystem)]
    placed = [b for b in result.blocks if isinstance(b, PlacedSystem)]
    assert len(placed) == len(sources)
    reduced = 0
    for source, system in zip(sources, placed, strict=True):
        assert (system.width, system.bars) == (source.width, source.bars)
        assert [c.index for c in system.columns] == [c.index for c in source.columns]
        for src, out in zip(source.columns, system.columns, strict=True):
            classes = {
                fretted_pitch(guitar.strings[n.line - 1], capo, n.fret) % STEPS_PER_OCTAVE
                for n in src.notes
            }
            assert 1 <= len(out.notes) <= min(len(src.notes), 4)
            assert len({n.course for n in out.notes}) == len(out.notes)
            assert {n.pitch % STEPS_PER_OCTAVE for n in out.notes} <= classes
            for n in out.notes:
                assert 0 <= n.position <= max_position(n.course)
                assert pitch_at(tuning, Location(n.course, n.position)) == n.pitch
            reduced += len(out.notes) < len(src.notes)
    assert sum(a.kind == "chord_reduced" for a in result.alterations) == reduced
    texts = [b for b in document.blocks if isinstance(b, TextBlock)]
    assert [b for b in result.blocks if isinstance(b, TextBlock)] == texts

    again = parse_tab(render_converted(result, tuning, "frets"))
    assert [len(b.columns) for b in again.blocks if isinstance(b, TabSystem)] == [
        len(s.columns) for s in sources
    ]


def test_two_thousand_events_convert_in_under_a_second() -> None:
    rng = random.Random(7)
    systems = []
    for _ in range(100):
        columns = []
        for _ in range(20):
            lines = rng.sample(range(6), rng.choice((1, 1, 1, 2, 3, 5)))
            columns.append([rng.randint(0, 12) if i in lines else None for i in range(6)])
        systems.append(_text(columns))
    document = parse_tab("\n\n".join(systems))
    tuning = TUNINGS["cc"]
    for cached in (options, placements):
        cached.cache_clear()
    start = time.perf_counter()
    result = convert(document, GUITAR_TUNINGS["standard"].strings, 0, tuning)
    elapsed = time.perf_counter() - start
    assert sum(len(b.columns) for b in result.blocks if isinstance(b, PlacedSystem)) == 2000
    assert elapsed < 1.0
