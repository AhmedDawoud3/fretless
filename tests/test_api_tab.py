from fastapi.testclient import TestClient
from httpx import Response

from fretless.api import app
from fretless.tab.model import TabSystem
from fretless.tab.parse import parse_tab

client = TestClient(app)
STANDARD = [104, 94, 86, 76, 66, 56]
SAMPLE = """Intro
e|-----0-----0-----|-----0--3--|
B|---1-----1-------|---1-------|
G|-0-----0---------|-0---------|
D|-----------------|-----------|
A|-3---------------|-3---------|
E|-----------------|-----------|

[Verse]   Am        C
e|--0--------0--|--10-12h14p12--|
B|--1--------1--|---------------|
G|--2--------0--|---------------|
D|--2--------2--|---------------|
A|--0--------3--|---------------|
E|-----------x--|---------------|
"""


def convert(**body: object) -> Response:
    payload = {
        "text": SAMPLE,
        "guitar": {"strings": STANDARD, "capo": 0},
        "oud_tuning": "cc",
        **body,
    }
    return client.post("/api/tab/convert", json=payload)


def test_two_system_example_converts() -> None:
    # the high run in the second system (frets 10 to 14 on the top string) puts 4 of 26 notes
    # above the oud's range; an octave down would rescue only 3 (one open A falls below C2),
    # under the quarter needed, so the piece stays put and the 4 notes are folded one by one
    response = convert()
    assert response.status_code == 200
    body = response.json()
    assert body["text"].startswith("Intro\nC|")
    assert len(parse_tab(body["text"]).blocks) == len(parse_tab(SAMPLE).blocks)
    assert [s["index"] for s in body["systems"]] == [0, 1]
    first = body["systems"][0]
    assert first["labels"] == ["C", "G", "D", "A", "F", "C"]
    assert (first["width"], first["bars"]) == (29, [17])
    assert first["columns"][0] == {
        "index": 1,
        "notes": [
            {"course": 2, "position": 0, "pitch": 86, "name": "G"},
            {"course": 4, "position": 6, "pitch": 72, "name": "C"},
        ],
    }


def test_converted_text_parses_back_to_the_same_number_of_systems() -> None:
    again = parse_tab(convert().json()["text"])
    assert sum(1 for b in again.blocks if hasattr(b, "columns")) == 2


def test_summary_agrees_with_the_alterations() -> None:
    body = convert().json()
    count = lambda kind: sum(a["kind"] == kind for a in body["alterations"])  # noqa: E731
    summary = body["summary"]
    assert summary["octave_shifted"] == count("octave_shifted")
    assert summary["chords_reduced"] == count("chord_reduced")
    assert summary["unsupported_systems"] == count("unsupported_system")
    assert summary["transposed_steps"] == 0
    assert count("transposed") == 0
    assert count("octave_shifted") == 4  # the four notes above C5, folded one by one
    source = [b for b in parse_tab(SAMPLE).blocks if isinstance(b, TabSystem)]
    assert summary["notes_in"] == sum(len(c.notes) for b in source for c in b.columns)
    placed = sum(len(c["notes"]) for sys in body["systems"] for c in sys["columns"])
    assert summary["notes_out"] == placed <= summary["notes_in"]


def test_playback_lists_every_event_with_running_ticks() -> None:
    body = convert().json()
    events = body["playback"]
    assert len(events) == sum(len(s["columns"]) for s in body["systems"])
    assert events[0] == {
        "system": 0,
        "column": 1,
        "tick": 1,
        "notes": [
            {"pitch": 86, "course": 2, "position": 0},
            {"pitch": 72, "course": 4, "position": 6},
        ],
    }
    ticks = [e["tick"] for e in events]
    assert ticks == sorted(ticks)


def test_names_mode_prints_note_letters() -> None:
    one = chr(10).join(["e|---|", "B|---|", "G|-0-|", "D|---|", "A|---|", "E|---|"])
    assert "G|-G-|" in convert(text=one, mode="names").json()["text"]


def test_text_without_tab_comes_back_unchanged_with_nothing_reported() -> None:
    body = convert(text="no tab here").json()
    assert body["text"] == "no tab here"
    assert (body["systems"], body["alterations"], body["playback"]) == ([], [], [])
    assert set(body["summary"].values()) == {0}


def test_unsupported_system_is_reported() -> None:
    seven = "\n".join(["e|--0--|"] * 7)
    body = convert(text=seven).json()
    assert body["text"] == seven
    assert [a["kind"] for a in body["alterations"]] == ["unsupported_system"]
    assert body["summary"]["unsupported_systems"] == 1
    assert body["systems"] == []


def test_ff_tuning_has_its_own_labels() -> None:
    assert convert(oud_tuning="ff").json()["systems"][0]["labels"] == list("FCGDAF")


def test_bad_input_is_422() -> None:
    bad_guitar = [
        {"strings": STANDARD[:5], "capo": 0},
        {"strings": [*STANDARD[:5], 57], "capo": 0},
        {"strings": [*STANDARD[:5], 22], "capo": 0},
        {"strings": STANDARD, "capo": 13},
        {"strings": STANDARD, "capo": -1},
    ]
    for guitar in bad_guitar:
        assert convert(guitar=guitar).status_code == 422
    assert convert(mode="sideways").status_code == 422
    assert convert(text="").status_code == 422
    assert convert(text="x" * 200_001).status_code == 422
    assert convert(text="x" * 200_000).status_code == 200


def test_unknown_tuning_is_404() -> None:
    assert convert(oud_tuning="bayati").status_code == 404


def test_guitar_systems_and_playback_are_returned_for_source_tab() -> None:
    body = convert().json()
    assert len(body["guitar_systems"]) == 2
    first = body["guitar_systems"][0]
    assert first["labels"] == ["E", "B", "G", "D", "A", "E"]
    assert first["columns"][0]["notes"] == [
        {"course": 3, "position": 0, "pitch": 86, "name": "G"},
        {"course": 5, "position": 3, "pitch": 72, "name": "C"},
    ]
    assert len(body["guitar_playback"]) == len(body["playback"])
    assert body["guitar_playback"][0]["notes"][0]["pitch"] == 86
