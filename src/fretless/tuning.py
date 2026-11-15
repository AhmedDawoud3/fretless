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
        _from_low("cc", "C2013C", (48, 58, 66, 76, 86, 96)),  # C2 F2 A2 D3 G3 C4
        _from_low("ff", "F2013F", (58, 66, 76, 86, 96, 106)),  # F2 A2 D3 G3 C4 F4
    )
}
