from itertools import accumulate

from fretless.interval import INTERVALS, interval_between
from fretless.maqam import MAQAMAT


def test_table_is_ordered_and_keyed_by_steps() -> None:
    assert list(INTERVALS) == sorted(INTERVALS)
    assert all(k == i.steps for k, i in INTERVALS.items())
    assert INTERVALS[0].id == "unison"
    assert INTERVALS[24].id == "octave"


def test_every_twelve_tone_step_is_present() -> None:
    assert all(s in INTERVALS for s in range(0, 25, 2))


def test_perfect_fifth() -> None:
    fifth = INTERVALS[14]
    assert (fifth.id, fifth.name, fifth.short) == ("perfect_fifth", "Perfect fifth", "P5")
    assert (fifth.frets, fifth.quarter_tone, fifth.level) == ("7 frets", False, 1)


def test_frets_wording() -> None:
    assert INTERVALS[2].frets == "1 fret"
    assert INTERVALS[4].frets == "2 frets"
    assert INTERVALS[3].frets == "1½ frets"
    assert INTERVALS[7].frets == "3½ frets"
    assert INTERVALS[0].frets == "0 frets"


def test_quarter_tone_flag_and_level() -> None:
    odd = [i for i in INTERVALS.values() if i.steps % 2]
    assert odd
    assert all(i.quarter_tone and i.level == 4 for i in odd)
    assert not any(i.quarter_tone or i.level == 4 for i in INTERVALS.values() if i.steps % 2 == 0)


def test_levels() -> None:
    by_level = {n: {i.id for i in INTERVALS.values() if i.level == n} for n in (1, 2, 3)}
    assert by_level[1] == {
        "octave", "perfect_fifth", "perfect_fourth", "major_third", "minor_third",
    }  # fmt: skip
    assert by_level[2] == {"major_second", "minor_second", "major_sixth", "minor_sixth"}
    assert by_level[3] == {"tritone", "minor_seventh", "major_seventh", "unison"}


def test_every_odd_interval_from_a_maqam_root_has_an_entry() -> None:
    odd = {s for m in MAQAMAT.values() for s in accumulate(m.intervals) if s % 2}
    assert odd
    assert odd <= INTERVALS.keys()


def test_interval_between() -> None:
    assert interval_between(10, 24) == INTERVALS[14]
    assert interval_between(5, 5) == INTERVALS[0]
    assert interval_between(24, 10) is None
    assert interval_between(0, 25) is None
    assert interval_between(0, 5) is None
