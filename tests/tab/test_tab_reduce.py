from fretless.tab.reduce import octave_variants, rungs
from fretless.tab.transpose import Range


def test_one_note_has_one_rung() -> None:
    assert rungs((96,)) == (((96,),),)


def test_two_notes_fall_back_to_the_top_note() -> None:
    assert rungs((86, 96)) == (((96, 86),), ((96,),))


def test_inner_notes_drop_before_the_bass_and_the_top_note_never_drops() -> None:
    found = rungs((70, 80, 90, 100))
    assert found == (
        ((100, 90, 80, 70),),
        ((100, 90, 70), (100, 80, 70)),  # one inner note dropped, bass kept
        ((100, 70),),
        ((100, 90, 80),),  # now the bass may go
        ((100, 90), (100, 80)),
        ((100,),),
    )


def test_duplicate_pitch_classes_drop_before_inner_notes() -> None:
    # F2 C3 F3 A3 C4 F4: the second F and the second C are duplicates of lower notes
    found = rungs((58, 72, 82, 90, 96, 106))
    assert found[0] == ((106, 96, 90, 82, 72, 58),)
    assert found[1] == ((106, 90, 72, 58),)
    assert all(len(sub) < 4 for rung in found[2:] for sub in rung)
    assert found[-1] == ((106,),)


def test_a_duplicate_that_is_the_top_or_bottom_note_is_kept() -> None:
    assert rungs((58, 82, 106))[1] == ((106, 58),)


def test_octave_variants_move_one_inner_note_staying_between_top_and_bass() -> None:
    span = Range(48, 120)
    assert octave_variants((110, 80, 60), span) == ((110, 104, 60),)  # 56 would pass the bass
    assert octave_variants((100, 60), span) == ()  # no inner note
    assert octave_variants((110, 86, 62), span) == ()  # both octaves land on an existing note
    assert octave_variants((118, 100, 50), span) == ((118, 76, 50),)  # 124 is above the range
