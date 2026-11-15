from fretless.guitar import GUITAR_TUNINGS, shape_pitches

STANDARD = GUITAR_TUNINGS["standard"].strings


def test_standard_is_e_a_d_g_b_e_stored_high_to_low() -> None:
    assert STANDARD == (104, 94, 86, 76, 66, 56)


def test_presets_are_listed_in_order() -> None:
    assert list(GUITAR_TUNINGS) == ["standard", "drop_d", "half_down", "dadgad", "open_g", "open_d"]


def test_presets_low_to_high() -> None:
    low_to_high = {k: tuple(reversed(t.strings)) for k, t in GUITAR_TUNINGS.items()}
    assert low_to_high["drop_d"] == (52, 66, 76, 86, 94, 104)
    assert low_to_high["half_down"] == (54, 64, 74, 84, 92, 102)
    assert low_to_high["dadgad"] == (52, 66, 76, 86, 90, 100)
    assert low_to_high["open_g"] == (52, 62, 76, 86, 94, 100)
    assert low_to_high["open_d"] == (52, 66, 76, 84, 90, 100)


def test_every_preset_has_six_even_strings() -> None:
    for tuning in GUITAR_TUNINGS.values():
        assert len(tuning.strings) == 6
        assert all(p % 2 == 0 for p in tuning.strings)


def test_shape_pitches_skip_muted_strings_and_run_low_to_high() -> None:
    # x32010 (string 6 muted), frets listed string 1 first: A+3 = C3, D+2 = E3, G, B+1 = C4, E
    shape = shape_pitches(STANDARD, 0, (0, 1, 0, 2, 3, None))
    assert shape == (66 + 6, 76 + 4, 86, 94 + 2, 104)


def test_capo_raises_every_fretted_and_open_string() -> None:
    assert shape_pitches(STANDARD, 2, (0, None, None, None, None, 0)) == (56 + 4, 104 + 4)
