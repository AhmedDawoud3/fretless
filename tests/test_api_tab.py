import base64

import pymupdf
import pytest
from fastapi.testclient import TestClient
from httpx import Response

from fretless.api import app
from fretless.tab.import_model import ImportedTab, ImportedTrack
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


def test_convert_expands_pasted_chord_sheets_and_ug_tags() -> None:
    body = convert(text="[Intro]\n[ch]Am[/ch]  [ch]E7[/ch]  [ch]G[/ch]  [ch]D[/ch]").json()
    assert len(body["systems"]) == 1
    assert len(body["guitar_systems"]) == 1
    assert len(body["guitar_systems"][0]["columns"]) == 4


def test_import_pdf_endpoint_extracts_tab_and_rejects_bad_input() -> None:
    doc = pymupdf.Document()
    page = doc.new_page()
    page.insert_text((80, 40), "Sample")
    shape = page.new_shape()
    for i in range(6):
        y = 100.0 + i * 8.0
        shape.draw_line(pymupdf.Point(40, y), pymupdf.Point(400, y))
    shape.finish(width=0.6)
    shape.commit()
    page.insert_text((100, 103.0), "3", fontsize=8)
    encoded = base64.b64encode(doc.tobytes()).decode("ascii")

    res = client.post("/api/tab/import-pdf", json={"pdf_base64": encoded, "filename": "s.pdf"})
    assert res.status_code == 200
    data = res.json()
    assert data["source"] == "pdf"
    assert data["kind"] == "tab"
    assert "3" in data["text"]

    assert client.post("/api/tab/import-pdf", json={"pdf_base64": "!!!"}).status_code == 422


def test_import_pdf_endpoint_supports_sheet_music() -> None:
    doc = pymupdf.Document()
    page = doc.new_page()
    lines = page.new_shape()
    for i in range(5):
        y = 120.0 + i * 8.0
        lines.draw_line(pymupdf.Point(40, y), pymupdf.Point(400, y))
    lines.finish(width=0.6)
    lines.commit()
    oval = page.new_shape()
    oval.draw_oval(pymupdf.Rect(116.5, 149.6, 123.5, 154.4))
    oval.finish(color=(0, 0, 0), fill=(0, 0, 0), width=0.5)
    oval.commit()
    encoded = base64.b64encode(doc.tobytes()).decode("ascii")

    res = client.post(
        "/api/tab/import-pdf",
        json={"pdf_base64": encoded, "filename": "sheet.pdf", "kind": "sheet"},
    )
    assert res.status_code == 200
    assert res.json()["kind"] == "sheet"
    assert "0" in res.json()["text"]


def test_import_url_endpoint_returns_imported_tab_and_422_on_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import fretless.api.tab_routes as tab_routes

    def fake_import(url: str, kind: str = "auto", track: int | None = None) -> ImportedTab:
        if "bad" in url:
            raise ValueError("Enter a valid Ultimate Guitar or Songsterr URL.")
        chosen = 3 if track is None else track
        return ImportedTab(
            title="Eagles — Hotel California",
            source="ultimate-guitar",
            kind="chords",
            text="e|--0--|\nB|--1--|\nG|--2--|\nD|--2--|\nA|--0--|\nE|-----|",
            strings=tuple(STANDARD),
            capo=2,
            track_index=chosen,
            tracks=(
                ImportedTrack(0, "Rhythm Guitar", "Electric Guitar (clean)", False),
                ImportedTrack(3, "Vocals", "Tenor Sax", True),
            ),
        )

    monkeypatch.setattr(tab_routes, "import_tab_url", fake_import)
    ok = client.post(
        "/api/tab/import-url",
        json={
            "url": "https://tabs.ultimate-guitar.com/tab/eagles/hotel-california-chords-46190",
            "track": 0,
        },
    )
    assert ok.status_code == 200
    assert ok.json()["capo"] == 2
    assert ok.json()["strings"] == STANDARD
    assert ok.json()["track_index"] == 0
    assert len(ok.json()["tracks"]) == 2
    assert ok.json()["tracks"][1]["is_vocal"] is True

    bad = client.post("/api/tab/import-url", json={"url": "https://bad.example.com"})
    assert bad.status_code == 422


def test_convert_endpoint_supports_transpose_semitones() -> None:
    text = "e|-0h2--5-|\nB|--------|\nG|--------|\nD|--------|\nA|--------|\nE|--------|"
    base = client.post(
        "/api/tab/convert",
        json={
            "text": text,
            "guitar": {"strings": STANDARD, "capo": 0},
            "oud_tuning": "cc",
        },
    ).json()
    transposed = client.post(
        "/api/tab/convert",
        json={
            "text": text,
            "guitar": {"strings": STANDARD, "capo": 0},
            "oud_tuning": "cc",
            "transpose_semitones": -12,
        },
    )
    assert transposed.status_code == 200
    body = transposed.json()
    assert body["summary"]["transposed_steps"] == -24
    base_pitches = [n["pitch"] for col in base["systems"][0]["columns"] for n in col["notes"]]
    down_pitches = [n["pitch"] for col in body["systems"][0]["columns"] for n in col["notes"]]
    assert down_pitches == [p - 24 for p in base_pitches]
    assert list(body["systems"][0]["techniques"].values()) == ["h"]

    bad = client.post(
        "/api/tab/convert",
        json={
            "text": text,
            "guitar": {"strings": STANDARD, "capo": 0},
            "oud_tuning": "cc",
            "transpose_semitones": 25,
        },
    )
    assert bad.status_code == 422


def test_transpose_endpoint_replaces_already_placed_systems() -> None:
    text = "e|-0h2--5-|\nB|--------|\nG|--------|\nD|--------|\nA|--------|\nE|--------|"
    converted = client.post(
        "/api/tab/convert",
        json={
            "text": text,
            "guitar": {"strings": STANDARD, "capo": 0},
            "oud_tuning": "cc",
        },
    ).json()
    res = client.post(
        "/api/tab/transpose",
        json={
            "systems": converted["systems"],
            "oud_tuning": "cc",
            "mode": "both",
            "transpose_semitones": -12,
            "tempo": 108,
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["summary"]["transposed_steps"] == -24
    assert body["tempo"] == 108
    orig_pitches = [n["pitch"] for col in converted["systems"][0]["columns"] for n in col["notes"]]
    new_pitches = [n["pitch"] for col in body["systems"][0]["columns"] for n in col["notes"]]
    assert new_pitches == [p - 24 for p in orig_pitches]
    assert list(body["systems"][0]["techniques"].values()) == ["h"]

    bad = client.post(
        "/api/tab/transpose",
        json={
            "systems": converted["systems"],
            "oud_tuning": "cc",
            "transpose_semitones": -30,
        },
    )
    assert bad.status_code == 422
