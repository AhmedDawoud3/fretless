from fretless.maqam_detect import detect_maqam_from_pitches


def test_detect_maqam_identifies_quarter_tone_and_semitone_maqamat() -> None:
    # C Rast: C D Ed F G Ad Bd C returning to tonic C
    rast_pitches = [96, 100, 103, 106, 110, 114, 117, 120, 96]
    matches = detect_maqam_from_pitches(rast_pitches, limit=3)
    assert len(matches) == 3
    assert matches[0].maqam_id == "rast"
    assert matches[0].root == 0
    assert matches[0].root_name == "C"
    assert matches[0].confidence >= 85
    assert matches[0].scale_pitches[0] == 96

    # C Nahawand (C natural minor): C D Eb F G Ab Bb C
    nahawand_pitches = [96, 100, 102, 106, 110, 112, 116, 96]
    nahawand = detect_maqam_from_pitches(nahawand_pitches, limit=2)
    assert nahawand[0].maqam_id == "nahawand"
    assert nahawand[0].root == 0

    assert detect_maqam_from_pitches(()) == ()
