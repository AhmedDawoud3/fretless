from fastapi.testclient import TestClient

from fretless.api import app


def test_health_reports_ok() -> None:
    response = TestClient(app).get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


client = TestClient(app)


def test_tunings_lists_id_and_label() -> None:
    response = client.get("/api/tunings")

    assert response.status_code == 200
    assert response.json() == [
        {"id": "cc", "label": "C–C"},  # noqa: RUF001 (en dash in label)
        {"id": "ff", "label": "F–F"},  # noqa: RUF001 (en dash in label)
    ]


def test_neck_describes_courses_and_locations() -> None:
    body = client.get("/api/neck/cc").json()

    assert body["tuning"] == {"id": "cc", "label": "C–C"}  # noqa: RUF001 (en dash in label)
    assert body["courses"][0] == {"course": 1, "open_pitch": 96, "max_position": 24}
    assert body["courses"][5] == {"course": 6, "open_pitch": 48, "max_position": 14}
    assert len(body["locations"]) == 5 * 15 + 25
    assert body["locations"][0] == {
        "course": 1,
        "position": 0,
        "pitch": 96,
        "name": {"letter": "C", "alter": 0, "octave": 4},
    }


def test_neck_unknown_tuning_is_404() -> None:
    assert client.get("/api/neck/nope").status_code == 404


def test_maqamat_lists_all_eight() -> None:
    body = client.get("/api/maqamat").json()

    assert [m["id"] for m in body][:2] == ["rast", "bayati"]
    assert len(body) == 8
    assert set(body[0]) == {"id", "name", "arabic_name", "intervals", "default_root", "description"}


def test_rast_scale_defaults_to_its_root() -> None:
    body = client.get("/api/maqamat/rast/scale").json()

    assert body["root"] == 0
    assert body["maqam"]["id"] == "rast"
    assert body["degrees"][2] == {"degree": 3, "pitch_class": 7, "letter": "E", "alter": -1}
    assert len(body["degrees"]) == 7


def test_scale_locations_carry_degree_and_exact_name() -> None:
    body = client.get("/api/maqamat/hijaz/scale", params={"root": 4, "tuning": "ff"}).json()

    letters_by_degree = {d["degree"]: (d["letter"], d["alter"]) for d in body["degrees"]}
    assert letters_by_degree[3] == ("F", 2)
    for loc in body["locations"]:
        name = loc["name"]
        natural = {"C": 0, "D": 4, "E": 8, "F": 10, "G": 14, "A": 18, "B": 22}[name["letter"]]
        assert name["octave"] * 24 + natural + name["alter"] == loc["pitch"]
        assert (name["letter"], name["alter"]) == letters_by_degree[loc["degree"]]
        assert loc["pitch"] % 24 in {d["pitch_class"] for d in body["degrees"]}


def test_scale_locations_cover_the_whole_neck() -> None:
    body = client.get("/api/maqamat/rast/scale").json()
    pcs = {d["pitch_class"] for d in body["degrees"]}
    neck = client.get("/api/neck/cc").json()["locations"]

    assert len(body["locations"]) == len([loc for loc in neck if loc["pitch"] % 24 in pcs])


def test_playback_is_an_ascending_octave_on_the_neck() -> None:
    body = client.get("/api/maqamat/rast/scale", params={"root": 0}).json()
    opens = {c["course"]: c["open_pitch"] for c in client.get("/api/neck/cc").json()["courses"]}

    playback = body["playback"]
    assert [p["pitch"] for p in playback] == [48, 52, 55, 58, 62, 66, 69, 72]
    assert playback[2]["name"] == {"letter": "E", "alter": -1, "octave": 2}
    assert playback[7]["name"] == {"letter": "C", "alter": 0, "octave": 3}
    for p in playback:
        loc = p["location"]
        assert loc is not None
        assert opens[loc["course"]] + loc["position"] == p["pitch"]


def test_scale_errors() -> None:
    assert client.get("/api/maqamat/nope/scale").status_code == 404
    assert client.get("/api/maqamat/rast/scale", params={"tuning": "nope"}).status_code == 404
    assert client.get("/api/maqamat/rast/scale", params={"root": 24}).status_code == 422
    assert client.get("/api/maqamat/rast/scale", params={"root": -1}).status_code == 422
