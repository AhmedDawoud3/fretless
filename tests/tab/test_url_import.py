import gzip
import html
import json

import pytest

from fretless.guitar import GUITAR_TUNINGS
from fretless.tab.model import TabSystem
from fretless.tab.parse import parse_tab
from fretless.tab.tuning_parse import parse_tuning_spec
from fretless.tab.url_import import import_tab_url, parse_ug_html, render_songsterr_track

STANDARD = GUITAR_TUNINGS["standard"].strings


def _ug_page(song: str, artist: str, tab_type: str, content: str, meta: dict[str, object]) -> str:
    payload = {
        "store": {
            "page": {
                "data": {
                    "tab": {"song_name": song, "artist_name": artist, "type": tab_type},
                    "tab_view": {"wiki_tab": {"content": content}, "meta": meta},
                }
            }
        }
    }
    encoded = html.escape(json.dumps(payload), quote=True)
    return f'<html><body><div class="js-store" data-content="{encoded}"></div></body></html>'


def test_parse_ug_html_imports_tab_and_metadata() -> None:
    raw_tab = (
        "[Intro]\n[tab]e|--0--2--|\nB|--1--3--|\nG|--2--2--|\n"
        "D|--2--0--|\nA|--0-----|\nE|--------|[/tab]"
    )
    doc_html = _ug_page(
        "My Riff",
        "Artist",
        "Tabs",
        raw_tab,
        {"capo": 2, "tuning": {"value": "D A D G B E"}},
    )
    imported = parse_ug_html(doc_html)
    assert imported.source == "ultimate-guitar"
    assert imported.kind == "tab"
    assert imported.title == "Artist — My Riff"
    assert imported.capo == 2
    assert imported.strings == parse_tuning_spec("D A D G B E")
    systems = [b for b in parse_tab(imported.text).blocks if isinstance(b, TabSystem)]
    assert len(systems) == 1
    assert systems[0].columns[0].notes[0].fret == 0


def test_parse_ug_html_expands_chords_page() -> None:
    chords = "[Verse]\n[tab][ch]Am[/ch]        [ch]E7[/ch]\n  On a dark highway[/tab]"
    doc_html = _ug_page("Hotel", "Eagles", "Chords", chords, {"capo": 2})
    imported = parse_ug_html(doc_html)
    assert imported.kind == "chords"
    assert imported.capo == 2
    systems = [b for b in parse_tab(imported.text).blocks if isinstance(b, TabSystem)]
    assert len(systems) == 1
    assert len(systems[0].columns) == 2


def test_parse_ug_html_rejects_missing_store() -> None:
    with pytest.raises(ValueError, match="Ultimate Guitar"):
        parse_ug_html("<html><body>blocked</body></html>")


def test_render_songsterr_track_builds_six_line_systems() -> None:
    track = {
        "name": "Lead Guitar",
        "tuning": [64, 59, 55, 50, 45, 40],
        "measures": [
            {
                "marker": {"text": "Intro"},
                "voices": [
                    {
                        "beats": [
                            {"notes": [{"string": 5, "fret": 0}], "chord": {"text": "Em"}},
                            {"notes": [{"string": 0, "fret": 12}]},
                            {"notes": [{"string": 0, "fret": 12, "tie": True}]},
                            {"notes": [{"rest": True}], "rest": True},
                        ]
                    }
                ],
            }
        ],
    }
    imported = render_songsterr_track(track, title="Metallica — Nothing Else Matters")
    assert imported.kind == "tab"
    assert imported.source == "songsterr"
    assert imported.strings == STANDARD
    assert "[Intro]" in imported.text
    systems = [b for b in parse_tab(imported.text).blocks if isinstance(b, TabSystem)]
    assert len(systems) == 1
    # tied repeat and rest note are omitted -> 2 beat columns
    assert len(systems[0].columns) == 2
    assert systems[0].columns[0].notes[0].line == 6
    assert systems[0].columns[1].notes[0].line == 1
    assert systems[0].columns[1].notes[0].fret == 12


def test_import_tab_url_fetches_songsterr_tab_and_chords() -> None:
    meta = {
        "songId": 42,
        "revisionId": 99,
        "image": "img1",
        "artist": "Band",
        "title": "Song",
        "popularTrackGuitar": 1,
        "tracks": [
            {"instrument": "Drums"},
            {"instrument": "Guitar", "tuning": [64, 59, 55, 50, 45, 40]},
        ],
    }
    track = {
        "tuning": [64, 59, 55, 50, 45, 40],
        "measures": [
            {"voices": [{"beats": [{"notes": [{"string": 2, "fret": 0}]}]}]},
        ],
    }
    chords_meta = {"songId": 42, "chordsRevisionId": 42, "chordpro": "abc"}
    chordpro = "{tuning: Standard (EADGBE)}\n[Em] hello [Am] world [D] ok"

    responses: dict[str, bytes] = {
        "https://www.songsterr.com/api/meta/42": json.dumps(meta).encode(),
        "https://dqsljvtekg760.cloudfront.net/42/99/img1/1.json": gzip.compress(
            json.dumps(track).encode()
        ),
        "https://www.songsterr.com/api/chords/42": json.dumps(chords_meta).encode(),
        "https://chordpro2.songsterr.com/42/42/abc.chordpro": gzip.compress(chordpro.encode()),
    }

    tab_res = import_tab_url(
        "https://www.songsterr.com/a/wsa/band-song-tab-s42t1",
        fetcher=responses.__getitem__,
    )
    assert tab_res.kind == "tab"
    assert len([b for b in parse_tab(tab_res.text).blocks if isinstance(b, TabSystem)]) == 1

    chords_res = import_tab_url(
        "https://www.songsterr.com/a/wsa/band-song-chords-s42",
        fetcher=responses.__getitem__,
    )
    assert chords_res.kind == "chords"
    assert chords_res.strings == STANDARD
    systems = [b for b in parse_tab(chords_res.text).blocks if isinstance(b, TabSystem)]
    assert len(systems) == 1
    assert len(systems[0].columns) == 3


def test_import_tab_url_rejects_unsupported_domains() -> None:
    with pytest.raises(ValueError, match="Ultimate Guitar or Songsterr"):
        import_tab_url("https://example.com/song")
