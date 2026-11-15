import pytest
from fastapi.testclient import TestClient

from fretless.api import app

client = TestClient(app)


def test_qualities_list_symbol_name_and_tones() -> None:
    body = client.get("/api/chords/qualities").json()

    assert len(body) == 16
    assert body[0] == {
        "id": "maj",
        "symbol": "",
        "name": "major",
        "tones": [
            {"semitones": 0, "role": "root"},
            {"semitones": 4, "role": "third"},
            {"semitones": 7, "role": "fifth"},
        ],
    }
    assert body[2]["id"] == "7"
    assert body[2]["tones"][3] == {"semitones": 10, "role": "seventh"}


def test_chord_describes_name_tones_and_spelling() -> None:
    chord = client.get("/api/chords/4/7?tuning=cc").json()["chord"]

    assert chord["root"] == 4
    assert chord["quality_id"] == "7"
    assert chord["symbol"] == "7"
    assert chord["name"] == {"letter": "D", "alter": 0}
    assert chord["tones"] == [
        {"pitch_class": 4, "letter": "D", "alter": 0, "role": "root"},
        {"pitch_class": 12, "letter": "F", "alter": 2, "role": "third"},
        {"pitch_class": 18, "letter": "A", "alter": 0, "role": "fifth"},
        {"pitch_class": 0, "letter": "C", "alter": 0, "role": "seventh"},
    ]


def test_tuning_defaults_to_cc() -> None:
    assert (
        client.get("/api/chords/0/maj").json() == client.get("/api/chords/0/maj?tuning=cc").json()
    )


def test_locations_are_every_chord_tone_on_the_neck_with_role_and_name() -> None:
    body = client.get("/api/chords/0/maj?tuning=cc").json()
    neck = {
        (loc["course"], loc["position"]): loc
        for loc in client.get("/api/neck/cc").json()["locations"]
    }
    roles = {0: "root", 8: "third", 14: "fifth"}

    assert body["locations"]
    for loc in body["locations"]:
        assert neck[(loc["course"], loc["position"])]["pitch"] == loc["pitch"]
        assert roles[loc["pitch"] % 24] == loc["role"]
    assert {(loc["course"], loc["position"]) for loc in body["locations"]} == {
        key for key, loc in neck.items() if loc["pitch"] % 24 in roles
    }
    first = body["locations"][0]
    assert first["name"] == {"letter": "C", "alter": 0, "octave": 4}  # course 1 open


@pytest.mark.parametrize("tuning", ["cc", "ff"])
def test_voicing_locations_match_the_neck(tuning: str) -> None:
    body = client.get(f"/api/chords/0/maj?tuning={tuning}").json()
    courses = {
        c["course"]: c["open_pitch"] for c in client.get(f"/api/neck/{tuning}").json()["courses"]
    }

    assert body["voicings"]
    assert len(body["voicings"]) <= 8
    for voicing in body["voicings"]:
        for loc in voicing["locations"]:
            assert courses[loc["course"]] + loc["position"] == loc["pitch"]
        assert 2 <= len(voicing["locations"]) <= 4


def test_voicing_reports_bass_span_and_open_courses() -> None:
    top = client.get("/api/chords/0/maj?tuning=cc").json()["voicings"][0]

    assert [(loc["course"], loc["position"]) for loc in top["locations"]] == [
        (4, 6), (3, 4), (2, 0), (1, 0),
    ]  # fmt: skip
    assert top["bass_is_root"] is True
    assert top["span"] == 2
    assert top["open_courses"] == 2
    assert top["locations"][0]["role"] == "root"


def test_arpeggio_climbs_from_the_lowest_root_to_the_octave_above() -> None:
    arpeggio = client.get("/api/chords/0/maj?tuning=cc").json()["arpeggio"]

    pitches = [step["pitch"] for step in arpeggio]
    assert pitches == [48, 56, 62, 72]
    assert arpeggio[0]["location"] == {"course": 6, "position": 0}
    assert arpeggio[-1]["name"] == {"letter": "C", "alter": 0, "octave": 3}


def test_arpeggio_starts_on_the_lowest_root_above_the_open_course() -> None:
    pitches = [s["pitch"] for s in client.get("/api/chords/18/min?tuning=cc").json()["arpeggio"]]

    assert pitches == [66, 72, 80, 90]
    assert pitches == sorted(pitches)


@pytest.mark.parametrize(
    "path", ["/api/chords/24/maj", "/api/chords/-2/maj", "/api/chords/3/maj", "/api/chords/x/maj"]
)
def test_bad_root_is_rejected(path: str) -> None:
    assert client.get(path).status_code == 422


def test_unknown_quality_or_tuning_is_not_found() -> None:
    assert client.get("/api/chords/0/nope").status_code == 404
    assert client.get("/api/chords/0/maj?tuning=nope").status_code == 404
