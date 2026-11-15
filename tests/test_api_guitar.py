import pytest
from fastapi.testclient import TestClient

from fretless.api import app

client = TestClient(app)
STANDARD = [104, 94, 86, 76, 66, 56]
C_SHAPE = [0, 1, 0, 2, 3, None]  # x32010 written string 1 first


def identify(**body: object) -> dict:
    payload = {"strings": STANDARD, "capo": 0, "frets": C_SHAPE, **body}
    return client.post("/api/guitar/identify", json=payload).json()


def test_tunings_list_each_string_from_the_highest() -> None:
    body = client.get("/api/guitar/tunings").json()

    assert [t["id"] for t in body] == [
        "standard",
        "drop_d",
        "half_down",
        "dadgad",
        "open_g",
        "open_d",
    ]
    assert body[0]["label"] == "Standard"
    assert body[0]["strings"][0] == {
        "string": 1,
        "pitch": 104,
        "name": {"letter": "E", "alter": 0, "octave": 4},
    }
    assert [s["pitch"] for s in body[0]["strings"]] == STANDARD
    assert [s["string"] for s in body[0]["strings"]] == [1, 2, 3, 4, 5, 6]


def test_x32010_is_c_major() -> None:
    body = identify()

    assert body["matches"][0] == {
        "root": 0,
        "quality_id": "maj",
        "symbol": "",
        "name": {"letter": "C", "alter": 0},
        "bass": {"letter": "C", "alter": 0},
        "missing": [],
    }


def test_notes_list_the_sounding_strings_only() -> None:
    notes = identify(capo=0)["notes"]

    assert [n["string"] for n in notes] == [1, 2, 3, 4, 5]
    assert notes[4] == {
        "string": 5,
        "fret": 3,
        "pitch": 72,
        "name": {"letter": "C", "alter": 0, "octave": 3},
    }


def test_capo_transposes_the_chord() -> None:
    body = identify(capo=2)

    assert body["matches"][0]["name"] == {"letter": "D", "alter": 0}
    assert body["notes"][4]["pitch"] == 72 + 4


def test_no_match_is_an_empty_list() -> None:
    body = identify(frets=[0, None, None, None, None, None])

    assert body["matches"] == []
    assert len(body["notes"]) == 1


@pytest.mark.parametrize(
    "bad",
    [
        {"strings": STANDARD[:5]},
        {"strings": [*STANDARD[:5], 55]},
        {"strings": [*STANDARD[:5], 20]},
        {"strings": [*STANDARD[:5], 146]},
        {"capo": 13},
        {"capo": -1},
        {"frets": [0, 1, 0, 2, 3]},
        {"frets": [25, 1, 0, 2, 3, None]},
        {"frets": [-1, 1, 0, 2, 3, None]},
    ],
)
def test_invalid_bodies_are_rejected(bad: dict) -> None:
    payload = {"strings": STANDARD, "capo": 0, "frets": C_SHAPE, **bad}

    assert client.post("/api/guitar/identify", json=payload).status_code == 422


def test_capo_defaults_to_zero() -> None:
    response = client.post("/api/guitar/identify", json={"strings": STANDARD, "frets": C_SHAPE})

    assert response.status_code == 200
    assert response.json()["matches"][0]["name"]["letter"] == "C"
