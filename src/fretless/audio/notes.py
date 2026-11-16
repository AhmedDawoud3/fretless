"""Decode Basic Pitch activation matrices into 24-TET quarter-tone note events."""

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

from fretless.audio.inference import AUDIO_SAMPLE_RATE, FFT_HOP

MIDI_OFFSET = 21
CONTOURS_PER_SEMITONE = 3
CONTOUR_TOLERANCE = 2
ENERGY_TOLERANCE = 11
FRAME_SECONDS = FFT_HOP / AUDIO_SAMPLE_RATE


@dataclass(frozen=True)
class DetectedNote:
    start_seconds: float
    duration_seconds: float
    pitch: int  # quarter-tone steps above C0
    amplitude: float


def _inferred_onsets(
    onsets: NDArray[np.float32], frames: NDArray[np.float32]
) -> NDArray[np.float32]:
    diffs = []
    for step in (1, 2):
        padded = np.vstack([np.zeros((step, frames.shape[1]), dtype=np.float32), frames])
        diffs.append(padded[step:, :] - padded[:-step, :])
    frame_diff = np.maximum(np.min(diffs, axis=0), 0.0)
    frame_diff[:2, :] = 0.0
    diff_max = float(frame_diff.max())
    if diff_max > 0.0:
        frame_diff = frame_diff * (float(onsets.max()) / diff_max)
    return np.maximum(onsets, frame_diff)


def _onset_peaks(inferred: NDArray[np.float32], threshold: float) -> list[tuple[int, int]]:
    padded = np.pad(inferred, ((1, 1), (0, 0)), constant_values=-1.0)
    mask = (inferred > padded[:-2]) & (inferred > padded[2:]) & (inferred > threshold)
    rows, cols = np.nonzero(mask)
    return list(zip(rows.tolist(), cols.tolist(), strict=True))[::-1]


def _trace_end(remaining: NDArray[np.float32], start: int, freq_idx: int, threshold: float) -> int:
    n_frames = remaining.shape[0]
    idx = start + 1
    quiet = 0
    while idx < n_frames - 1 and quiet < ENERGY_TOLERANCE:
        quiet = quiet + 1 if remaining[idx, freq_idx] < threshold else 0
        idx += 1
    return idx - quiet


def _zero_band(remaining: NDArray[np.float32], start: int, end: int, freq_idx: int) -> None:
    lo = max(0, freq_idx - 1)
    hi = min(remaining.shape[1], freq_idx + 2)
    remaining[start:end, lo:hi] = 0.0


def _estimate_pitch(contours: NDArray[np.float32], start: int, end: int, freq_idx: int) -> int:
    center = CONTOURS_PER_SEMITONE * freq_idx + 1
    lo = max(0, center - CONTOUR_TOLERANCE)
    hi = min(contours.shape[1], center + CONTOUR_TOLERANCE + 1)
    sub = contours[start:end, lo:hi]
    bend = 0
    if sub.size > 0 and float(sub.max()) > 0.0:
        bend = int(np.median(np.argmax(sub, axis=1))) - (center - lo)
    midi = freq_idx + MIDI_OFFSET
    return round((midi - 12) * 2 + bend * (2.0 / CONTOURS_PER_SEMITONE))


def extract_notes(
    frames: NDArray[np.float32],
    onsets: NDArray[np.float32],
    contours: NDArray[np.float32],
    onset_threshold: float = 0.5,
    frame_threshold: float = 0.3,
    min_note_frames: int = 5,
) -> tuple[DetectedNote, ...]:
    """Extract sorted 24-TET `DetectedNote` events from Basic Pitch output matrices."""
    if frames.size == 0:
        return ()
    inferred = _inferred_onsets(onsets, frames)
    remaining = frames.copy()
    detected: list[DetectedNote] = []
    for start, freq_idx in _onset_peaks(inferred, onset_threshold):
        if start >= frames.shape[0] - 1:
            continue
        end = _trace_end(remaining, start, freq_idx, frame_threshold)
        if end - start <= min_note_frames:
            continue
        _zero_band(remaining, start, end, freq_idx)
        amplitude = float(frames[start:end, freq_idx].mean())
        pitch = _estimate_pitch(contours, start, end, freq_idx)
        detected.append(
            DetectedNote(start * FRAME_SECONDS, (end - start) * FRAME_SECONDS, pitch, amplitude)
        )
    return tuple(sorted(detected, key=lambda n: (n.start_seconds, -n.pitch)))
