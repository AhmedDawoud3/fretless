from fretless.fingering import is_fingerable
from fretless.guitar import GUITAR_TUNINGS
from fretless.neck import Location
from fretless.tab.convert import (
    PlacedInputColumn,
    PlacedInputSystem,
    convert,
    transpose_placed_systems,
)
from fretless.tab.convert_model import Converted, PlacedNote, PlacedSystem
from fretless.tab.model import TextBlock
from fretless.tab.parse import parse_tab
from fretless.tuning import TUNINGS, Tuning

STANDARD = GUITAR_TUNINGS["standard"].strings  # 104 94 86 76 66 56
LABELS = "eBGDAE"
CC, FF = TUNINGS["cc"], TUNINGS["ff"]


def tab(**lines: str) -> str:
    """A 6-line system; keyword names are the string labels, missing lines are blank."""
    width = max(len(c) for c in lines.values())
    return "\n".join(f"{n}|{lines.get(n, '').ljust(width, '-').replace(' ', '-')}|" for n in LABELS)


def run(
    text: str, tuning: Tuning = CC, strings: tuple[int, ...] = STANDARD, capo: int = 0
) -> Converted:
    return convert(parse_tab(text), strings, capo, tuning)


def placed(result: Converted) -> list[PlacedNote]:
    return [
        n for b in result.blocks if isinstance(b, PlacedSystem) for c in b.columns for n in c.notes
    ]


def kinds(result: Converted) -> list[str]:
    return [a.kind for a in result.alterations]


def test_open_guitar_g_string_is_the_open_second_course_in_cc() -> None:
    result = run(tab(G="-0-"))
    assert placed(result) == [PlacedNote(2, 0, 86)]
    assert result.alterations == ()
    (system,) = result.blocks
    assert isinstance(system, PlacedSystem)
    assert (system.index, system.width, system.bars) == (0, 3, ())
    assert [c.index for c in system.columns] == [1]


def test_melody_above_the_range_is_moved_down_once_for_the_whole_piece() -> None:
    result = run(tab(e="-17--19--20-"))  # 138 142 144, all above C5 = 120
    assert [n.pitch for n in placed(result)] == [114, 118, 120]
    assert kinds(result) == ["transposed"]
    assert result.transposed_steps == -24
    assert result.alterations[0].system is None


def test_one_very_low_note_is_moved_alone() -> None:
    low = (*STANDARD[:5], 40)  # a low string tuned to E1, below C2
    result = run(tab(e="-0--2--3-", E="-----0----"), strings=low)
    assert result.transposed_steps == 0
    assert [(a.kind, a.system, a.column) for a in result.alterations] == [("octave_shifted", 0, 5)]
    assert "octave" in result.alterations[0].message
    assert sorted(n.pitch for n in placed(result)) == [64, 104, 108, 110]


def test_guitar_low_e_is_out_of_range_in_ff_and_untouched_in_cc() -> None:
    text = tab(e="-0--3--2-", E="-0--------")
    assert run(text, FF).alterations[0].kind == "octave_shifted"
    assert 80 in [n.pitch for n in placed(run(text, FF))]  # E2 = 56 up an octave
    assert run(text, CC).alterations == ()
    assert 56 in [n.pitch for n in placed(run(text, CC))]


def test_c_chord_keeps_the_melody_note_and_only_chord_tones() -> None:
    result = run(tab(e="-0-", B="-1-", G="-0-", D="-2-", A="-3-"))  # x32010, E4 on top
    (column,) = [c for b in result.blocks if isinstance(b, PlacedSystem) for c in b.columns]
    assert {n.pitch % 24 for n in column.notes} <= {0, 8, 14}  # C E G
    assert max(n.pitch for n in column.notes) % 24 == 8  # the top note is still an E
    assert len({n.course for n in column.notes}) == len(column.notes)
    stopped = tuple(Location(n.course, n.position) for n in column.notes if n.position > 0)
    assert is_fingerable(stopped)
    assert (kinds(result) == ["chord_reduced"]) == (len(column.notes) < 5)


def test_six_note_barre_chord_is_reduced_and_keeps_its_top_note() -> None:
    result = run(tab(e="-1-", B="-1-", G="-2-", D="-3-", A="-3-", E="-1-"))  # F: 133211
    (column,) = [c for b in result.blocks if isinstance(b, PlacedSystem) for c in b.columns]
    assert len(column.notes) < 6
    assert max(n.pitch for n in column.notes) == 106  # F4
    assert "chord_reduced" in kinds(result)


def test_stepwise_melody_stays_in_one_hand_position() -> None:
    result = run(tab(G="-0--2--4--5--7-"))  # 86 90 94 96 100
    notes = placed(result)
    assert [n.pitch for n in notes] == [86, 90, 94, 96, 100]
    assert max(n.position for n in notes) - min(n.position for n in notes) <= 8
    assert {n.course for n in notes} <= {1, 2}


def test_other_line_counts_pass_through_as_text_with_an_alteration() -> None:
    seven = "\n".join(["e|--0--|"] * 7)
    result = run(f"Intro\n{seven}\nOutro")
    assert result.blocks == (TextBlock("Intro"), TextBlock(seven), TextBlock("Outro"))
    assert [(a.kind, a.system, a.column) for a in result.alterations] == [
        ("unsupported_system", 0, None)
    ]


def test_text_blocks_pass_through_in_order_and_systems_are_numbered_across_all() -> None:
    text = f"Title\n{tab(G='-0-')}\n\nmiddle\n{tab(e='-0-')}\n"
    result = run(text)
    assert [type(b) for b in result.blocks] == [
        TextBlock,
        PlacedSystem,
        TextBlock,
        PlacedSystem,
        TextBlock,
    ]
    assert [b.index for b in result.blocks if isinstance(b, PlacedSystem)] == [0, 1]
    assert result.blocks[0] == TextBlock("Title")
    assert result.blocks[2] == TextBlock("\nmiddle")


def test_no_tab_converts_to_itself() -> None:
    result = run("just words")
    assert result.blocks == (TextBlock("just words"),)
    assert result.alterations == ()
    assert result.transposed_steps == 0


def column_notes(result: Converted) -> list[PlacedNote]:
    (column,) = [c for b in result.blocks if isinstance(b, PlacedSystem) for c in b.columns]
    return list(column.notes)


def test_already_placeable_two_and_three_note_columns_are_unchanged() -> None:
    two = run(tab(G="-0-", D="-0-"))  # G3 and D3 sound on the open courses 2 and 3
    assert column_notes(two) == [PlacedNote(2, 0, 86), PlacedNote(3, 0, 76)]
    three = run(tab(G="-0-", D="-0-", A="-2-"))  # plus B2: course 4 (66) at position 4
    assert column_notes(three) == [PlacedNote(2, 0, 86), PlacedNote(3, 0, 76), PlacedNote(4, 4, 70)]
    assert kinds(two) == kinds(three) == []


def test_x32010_becomes_an_easy_shape_of_at_most_four_notes() -> None:
    result = run(tab(e="-0-", B="-1-", G="-0-", D="-2-", A="-3-"))  # C3 E3 G3 C4 E4
    notes = column_notes(result)
    assert len(notes) <= 4
    assert max(n.pitch for n in notes) == 104  # E4 melody
    assert min(n.pitch for n in notes) == 72  # C3 bass
    assert all(n.position <= 10 for n in notes)  # nothing above virtual fret 5
    assert {n.pitch % 24 for n in notes} == {0, 8, 14}  # C E G
    reduced = [a for a in result.alterations if a.kind == "chord_reduced"]
    assert len(reduced) == 1
    assert reduced[0].message.startswith(f"{5 - len(notes)} chord note")


def test_f_barre_chord_keeps_melody_and_bass_in_four_notes_or_fewer() -> None:
    notes = column_notes(run(tab(e="-1-", B="-1-", G="-2-", D="-3-", A="-3-", E="-1-")))
    assert len(notes) <= 4
    assert max(n.pitch for n in notes) == 106  # F4
    assert min(n.pitch for n in notes) == 58  # F2


def test_open_g_and_e_chords_keep_root_and_third_in_both_tunings() -> None:
    g_major = tab(e="-3-", B="-0-", G="-0-", D="-0-", A="-2-", E="-3-")  # 320003
    e_major = tab(e="-0-", B="-0-", G="-1-", D="-2-", A="-2-", E="-0-")  # 022100
    # (text, source top note, root class, third class): G=14 B=22, E=8 G#=16
    for text, top, root, third in ((g_major, 110, 14, 22), (e_major, 104, 8, 16)):
        for tuning in (CC, FF):
            result = run(text, tuning)
            notes = column_notes(result)
            shift = result.transposed_steps
            assert len(notes) <= 4
            assert max(n.pitch for n in notes) % 24 == (top + shift) % 24
            classes = {n.pitch % 24 for n in notes}
            assert {(root + shift) % 24, (third + shift) % 24} <= classes


def test_e_chord_in_ff_folds_the_low_e_and_keeps_the_piece_in_place() -> None:
    result = run(tab(e="-0-", B="-0-", G="-1-", D="-2-", A="-2-", E="-0-"), FF)  # 022100
    notes = column_notes(result)
    assert result.transposed_steps == 0
    assert "transposed" not in kinds(result)
    assert max(n.pitch for n in notes) == 104  # E4 kept, not moved
    assert min(n.pitch for n in notes) >= 58  # E2 (56) is below F-F, so it was folded up
    assert {8, 16} <= {n.pitch % 24 for n in notes}  # E and G-sharp


def test_e_chord_in_cc_keeps_bass_third_and_melody_in_easy_positions() -> None:
    notes = column_notes(run(tab(e="-0-", B="-0-", G="-1-", D="-2-", A="-2-", E="-0-"), CC))
    assert (max(n.pitch for n in notes), min(n.pitch for n in notes)) == (104, 56)  # E4, E2
    assert {8, 16} <= {n.pitch % 24 for n in notes}  # E and G-sharp
    assert all(n.position <= 10 for n in notes)


def test_a_chord_keeps_the_same_notes_whatever_its_neighbours_are() -> None:
    bar = tab(
        e="-0--1--3--0-",
        B="-1--1--0--0-",
        G="-0--2--0--1-",
        D="-2--3--0--2-",
        A="-3--3--2--2-",
        E="----1--3--0-",
    )  # x32010 133211 320003 022100
    (system,) = run(bar).blocks
    assert isinstance(system, PlacedSystem)
    last = system.columns[-1].notes  # 022100
    assert max(n.pitch for n in last) == 104  # E4
    assert min(n.pitch for n in last) == 56  # E2
    assert {8, 16} <= {n.pitch % 24 for n in last}  # E and G-sharp


def test_explicit_transpose_drops_octave_without_best_shift_undoing_it() -> None:
    src = parse_tab(tab(e="-0--3-", E="-0----"))  # E4(104)+E2(56), then G4(110)
    baseline = convert(src, STANDARD, 0, CC)
    assert baseline.transposed_steps == 0

    dropped = convert(src, STANDARD, 0, CC, transpose_steps=-24)
    assert dropped.transposed_steps == -24
    # E4 drops to E3 (80); E2 (56) folds in CC (low=48) instead of dipping below range; G4 -> G3.
    assert [n.pitch for n in placed(dropped)] == [80, 56, 86]


def test_explicit_semitone_transpose_preserves_techniques() -> None:
    src = parse_tab(tab(e="-0h2--5/7-"))
    dropped = convert(src, STANDARD, 0, CC, transpose_steps=-10)
    assert dropped.transposed_steps == -10
    assert [n.pitch for n in placed(dropped)] == [94, 98, 104, 108]
    (system,) = dropped.blocks
    assert isinstance(system, PlacedSystem)
    assert [sym for _, _, sym in system.techniques] == ["h", "/"]


def test_transpose_placed_systems_shifts_pitches_preserves_bars_and_techniques() -> None:
    assert transpose_placed_systems((), CC, transpose_steps=-24) == Converted((), (), 0)
    systems = (
        PlacedInputSystem(
            index=0,
            width=12,
            bars=(6,),
            columns=(
                PlacedInputColumn(1, (PlacedNote(1, 0, 96),)),  # C4 on course 1
                PlacedInputColumn(3, (PlacedNote(1, 2, 98),)),
            ),
            techniques=((1, 1, "h"),),
        ),
    )
    shifted = transpose_placed_systems(systems, CC, transpose_steps=-24)
    assert shifted.transposed_steps == -24
    (placed_sys,) = shifted.blocks
    assert isinstance(placed_sys, PlacedSystem)
    assert placed_sys.bars == (6,)
    assert [n.pitch for c in placed_sys.columns for n in c.notes] == [72, 74]  # C3, D3
    assert [sym for _, col, sym in placed_sys.techniques if col == 1] == ["h"]


def test_quarter_tone_guitar_virtual_fret_converts_to_exact_oud_quarter_tone() -> None:
    # e|-1.5-| is F+4 (E4=104 + 2 + 1 = 107). On C-C tuning (course 1 = C4 = 96), position = 11.
    result = run(tab(e="-1.5-"))
    notes = column_notes(result)
    assert len(notes) == 1
    assert notes[0].pitch == 107
    assert notes[0].position % 2 == 1
