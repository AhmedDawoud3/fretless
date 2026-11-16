from fastapi.testclient import TestClient

from fretless.api import app
from fretless.course import Lesson, LessonStep, lessons_for_tuning
from fretless.neck import Location, max_position, pitch_at
from fretless.tuning import TUNINGS

client = TestClient(app)


def _by_id(tuning_id: str) -> dict[str, Lesson]:
    return {lesson.id: lesson for lesson in lessons_for_tuning(TUNINGS[tuning_id])}


def test_lessons_cover_both_tunings_with_valid_playable_steps() -> None:
    for tuning in TUNINGS.values():
        lessons = lessons_for_tuning(tuning)
        assert len(lessons) == 7
        assert [lesson.number for lesson in lessons] == list(range(1, 8))
        assert [lesson.id for lesson in lessons] == [
            "open-courses",
            "first-position",
            "quarter-tone",
            "maqam-rast",
            "maqam-bayati",
            "maqam-hijaz",
            "oud-cadence",
        ]
        for lesson in lessons:
            assert isinstance(lesson, Lesson)
            assert lesson.steps
            for step in lesson.steps:
                assert isinstance(step, LessonStep)
                assert 1 <= step.course <= len(tuning.courses)
                assert 0 <= step.position <= max_position(step.course)
                assert pitch_at(tuning, Location(step.course, step.position)) == step.pitch
                assert step.label


def test_open_courses_lesson_plays_courses_six_to_one_open() -> None:
    lessons = _by_id("cc")
    open_lesson = lessons["open-courses"]
    assert [(s.course, s.position) for s in open_lesson.steps] == [
        (6, 0),
        (5, 0),
        (4, 0),
        (3, 0),
        (2, 0),
        (1, 0),
    ]
    assert [s.label for s in open_lesson.steps] == ["C", "F", "A", "D", "G", "C"]


def test_quarter_tone_lesson_includes_half_flat_step() -> None:
    for tuning_id in TUNINGS:
        qt = _by_id(tuning_id)["quarter-tone"]
        assert any(s.position % 2 == 1 for s in qt.steps)
        assert any("d" in s.label for s in qt.steps)


def test_maqam_lessons_have_eight_step_scales() -> None:
    lessons = _by_id("cc")
    assert [s.pitch for s in lessons["maqam-rast"].steps] == [48, 52, 55, 58, 62, 66, 69, 72]
    assert [s.label for s in lessons["maqam-bayati"].steps] == [
        "D",
        "Ed",
        "F",
        "G",
        "A",
        "Bb",
        "C",
        "D",
    ]
    assert [s.label for s in lessons["maqam-hijaz"].steps] == [
        "D",
        "Eb",
        "F#",
        "G",
        "A",
        "Bb",
        "C",
        "D",
    ]


def test_courses_endpoint_returns_lessons_and_rejects_unknown_tuning() -> None:
    cc = client.get("/api/courses")
    assert cc.status_code == 200
    body = cc.json()
    assert len(body) == 7
    assert body[0]["id"] == "open-courses"
    assert set(body[0]) == {"id", "number", "title", "summary", "guitarist_tip", "steps"}
    assert set(body[0]["steps"][0]) == {"course", "position", "pitch", "label"}

    ff = client.get("/api/courses", params={"tuning": "ff"})
    assert ff.status_code == 200
    assert [s["label"] for s in ff.json()[0]["steps"]] == ["F", "A", "D", "G", "C", "F"]

    assert client.get("/api/courses", params={"tuning": "nope"}).status_code == 404
