"""Oud tunings. Courses are numbered from 1 (highest) to 6 (lowest)."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Tuning:
    id: str
    label: str
    courses: tuple[int, ...]  # open pitch per course, course 1 (highest) first


def _from_low(id: str, label: str, low_to_high: tuple[int, ...]) -> Tuning:
    return Tuning(id, label, tuple(reversed(low_to_high)))


TUNINGS: dict[str, Tuning] = {
    t.id: t
    for t in (
        _from_low("cc", "C–C", (48, 58, 66, 76, 86, 96)),  # noqa: RUF001 (en dash in label)
        _from_low("ff", "F–F", (58, 66, 76, 86, 96, 106)),  # noqa: RUF001 (en dash in label)
    )
}
