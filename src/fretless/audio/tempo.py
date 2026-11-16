"""Detect musical tempo (BPM) and convert onset times to beat-grid ticks."""

from collections.abc import Sequence
from itertools import pairwise
from statistics import median

from fretless.audio.notes import DetectedNote

_MIN_IOI = 0.15
_MAX_IOI = 1.5
_MIN_PERIOD = 0.375  # 160 BPM
_MAX_PERIOD = 1.0  # 60 BPM
_DEFAULT_BPM = 108
_CLUSTER_WINDOW = 0.06
_TICKS_PER_BEAT = 4


def _cluster_onsets(notes: Sequence[DetectedNote]) -> list[float]:
    starts: list[float] = []
    for item in sorted(notes, key=lambda n: n.start_seconds):
        if not starts or item.start_seconds - starts[-1] > _CLUSTER_WINDOW:
            starts.append(item.start_seconds)
    return starts


def _fold_beat_period(dt: float) -> float:
    while dt < _MIN_PERIOD:
        dt *= 2.0
    while dt > _MAX_PERIOD:
        dt /= 2.0
    return dt


def detect_audio_bpm(notes: Sequence[DetectedNote]) -> int:
    """Estimate a `60..160` BPM tempo from note inter-onset intervals."""
    onsets = _cluster_onsets(notes)
    intervals = [b - a for a, b in pairwise(onsets) if _MIN_IOI <= b - a <= _MAX_IOI]
    if len(intervals) < 3:
        return _DEFAULT_BPM
    period = median(_fold_beat_period(dt) for dt in intervals)
    return max(60, min(160, round(60.0 / period)))


def ticks_per_second_for_bpm(bpm: int) -> float:
    """Return tab column ticks per second (`4` ticks per quarter-note beat)."""
    return (bpm / 60.0) * _TICKS_PER_BEAT
