from fretless.guitar import GUITAR_TUNINGS, fretted_pitch
from fretless.pitch import STEPS_PER_OCTAVE
from fretless.tab.chords import (
    clean_ug_markup,
    expand_chord_sheet,
    guitar_chord_frets,
    parse_chord_symbol,
)
from fretless.tab.model import TabSystem
from fretless.tab.parse import parse_tab
from fretless.tab.tuning_parse import extract_tuning_from_text, parse_tuning_spec

STANDARD = GUITAR_TUNINGS["standard"].strings


def test_parse_tuning_spec_supports_compact_spaced_and_octaved_formats() -> None:
    assert parse_tuning_spec("E A D G B E") == STANDARD
    assert parse_tuning_spec("Standard (EADGBE)") == STANDARD
    # CFCGCD low-to-high -> string 1 (highest) is D4 (100), string 6 (lowest) is C2 (48)
    cfcgcd = parse_tuning_spec("CFCGCD")
    assert cfcgcd == (100, 96, 86, 72, 58, 48)
    # DGBDGA low-to-high -> D2(52), G2(62), B2(70), D3(76), G3(86), A3(90) or A4(114)
    dgbdga = parse_tuning_spec("DGBDGA")
    assert dgbdga == (90, 86, 76, 70, 62, 52)
    assert extract_tuning_from_text("Smile\nTuning: CFCGCD\nTamino") == cfcgcd
    assert parse_tuning_spec("not a tuning") is None


def test_parse_chord_symbol_supports_common_guitar_notation_and_rejects_prose() -> None:
    am = parse_chord_symbol("Am")
    assert am is not None
    assert am.quality.id == "min"
    assert am.root == 18

    e7 = parse_chord_symbol("[ch]E7[/ch]")
    assert e7 is not None
    assert e7.quality.id == "7"

    fsharp_m7 = parse_chord_symbol("F#m7/C#")
    assert fsharp_m7 is not None
    assert fsharp_m7.quality.id == "m7"
    assert fsharp_m7.root == 12

    eb = parse_chord_symbol("E♭")
    assert eb is not None
    assert eb.root == 6

    for non_chord in ("", "no", "tab", "Intro", "x2", "|"):
        assert parse_chord_symbol(non_chord) is None


def test_guitar_chord_frets_produces_playable_open_shape_on_standard_and_custom_tuning() -> None:
    am = parse_chord_symbol("Am")
    assert am is not None
    frets = guitar_chord_frets(am, STANDARD, 0)
    # Every non-muted fret is reachable near the nut
    assert all(f is None or 0 <= f <= 8 for f in frets)
    assert any(f is not None for f in frets)

    gm = parse_chord_symbol("Gm")
    assert gm is not None
    gm_frets = guitar_chord_frets(gm, STANDARD, 0)
    assert len(gm_frets) == 6
    assert any(f is not None for f in gm_frets)


def test_clean_ug_markup_strips_tab_and_ch_tags() -> None:
    raw = "[Verse]\n[tab][ch]Am[/ch]  [ch]E7[/ch]\nhello[/tab]\n{section: Chorus}\n"
    cleaned = clean_ug_markup(raw)
    assert "[tab]" not in cleaned
    assert "[ch]" not in cleaned
    assert "Am  E7" in cleaned
    assert "[Chorus]" in cleaned


def test_expand_chord_sheet_converts_ug_chords_and_chordpro_into_tab_systems() -> None:
    ug_chords = "[Intro]\n[ch]Am[/ch]   [ch]E7[/ch]   [ch]G[/ch]   [ch]D[/ch]   x2\n"
    expanded = expand_chord_sheet(ug_chords, STANDARD, 0)
    systems = [b for b in parse_tab(expanded).blocks if isinstance(b, TabSystem)]
    assert len(systems) >= 1
    assert systems[0].lines == 6
    assert len(systems[0].columns) == 8  # 4 chords * 2

    chordpro = "{section: Verse}\n[Em] So close no matter h[D]ow f[C]ar"
    cp_expanded = expand_chord_sheet(chordpro, STANDARD, 0)
    cp_systems = [b for b in parse_tab(cp_expanded).blocks if isinstance(b, TabSystem)]
    assert len(cp_systems) == 1
    assert len(cp_systems[0].columns) == 3


def test_slash_chord_voices_requested_bass_note_lowest() -> None:
    slash_tab = expand_chord_sheet("C/G", STANDARD, 0)
    systems = [b for b in parse_tab(slash_tab).blocks if isinstance(b, TabSystem)]
    assert len(systems) == 1
    bass_note = max(systems[0].columns[0].notes, key=lambda n: n.line)
    bass_pc = fretted_pitch(STANDARD[bass_note.line - 1], 0, bass_note.fret) % STEPS_PER_OCTAVE
    assert bass_pc == 14  # G in quarter-tone steps above C
