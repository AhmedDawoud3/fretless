from fastapi.testclient import TestClient

from fretless.api import app
from fretless.interval import INTERVALS

client = TestClient(app)


def test_intervals_listed_in_step_order() -> None:
    body = client.get("/api/intervals").json()
    assert len(body) == len(INTERVALS)
    assert [i["steps"] for i in body] == sorted(INTERVALS)


def test_perfect_fifth_entry() -> None:
    fifth = next(i for i in client.get("/api/intervals").json() if i["steps"] == 14)
    assert fifth == {
        "steps": 14, "id": "perfect_fifth", "name": "Perfect fifth", "short": "P5",
        "frets": "7 frets", "quarter_tone": False, "level": 1,
    }  # fmt: skip


def test_quarter_tone_entry() -> None:
    third = next(i for i in client.get("/api/intervals").json() if i["steps"] == 7)
    assert third["quarter_tone"] is True
    assert third["level"] == 4
    assert third["frets"] == "3½ frets"
