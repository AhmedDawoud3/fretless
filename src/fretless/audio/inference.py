"""Spotify Basic Pitch ONNX inference: windowing, model execution, and overlap unwrapping."""

from functools import cache
from pathlib import Path

import numpy as np
import onnxruntime as ort
from numpy.typing import NDArray

AUDIO_SAMPLE_RATE = 22050
FFT_HOP = 256
ANNOTATIONS_FPS = AUDIO_SAMPLE_RATE // FFT_HOP
AUDIO_N_SAMPLES = AUDIO_SAMPLE_RATE * 2 - FFT_HOP
N_OVERLAPPING_FRAMES = 30
OVERLAP_LEN = N_OVERLAPPING_FRAMES * FFT_HOP
HOP_SIZE = AUDIO_N_SAMPLES - OVERLAP_LEN
MODEL_PATH = Path(__file__).with_name("nmp.onnx")
INPUT_NAME = "serving_default_input_2:0"
OUTPUT_NAMES = [
    "StatefulPartitionedCall:1",
    "StatefulPartitionedCall:2",
    "StatefulPartitionedCall:0",
]


@cache
def _session() -> ort.InferenceSession:
    return ort.InferenceSession(str(MODEL_PATH), providers=["CPUExecutionProvider"])


def window_signal(samples: NDArray[np.float32]) -> NDArray[np.float32]:
    """Pad and slice mono audio into overlapping `(n_windows, AUDIO_N_SAMPLES, 1)` chunks."""
    padded = np.concatenate([np.zeros(OVERLAP_LEN // 2, dtype=np.float32), samples])
    windows = []
    for start in range(0, len(padded), HOP_SIZE):
        chunk = padded[start : start + AUDIO_N_SAMPLES]
        if len(chunk) < AUDIO_N_SAMPLES:
            chunk = np.pad(chunk, (0, AUDIO_N_SAMPLES - len(chunk)))
        windows.append(chunk[:, np.newaxis])
    return np.stack(windows, axis=0).astype(np.float32)


def unwrap_frames(batched: NDArray[np.float32], total_samples: int) -> NDArray[np.float32]:
    """Drop half-overlap edges from each window and trim to the original audio frame count."""
    half = N_OVERLAPPING_FRAMES // 2
    trimmed = batched[:, half:-half, :]
    flat = trimmed.reshape(-1, trimmed.shape[2])
    n_frames = int(total_samples * ANNOTATIONS_FPS / AUDIO_SAMPLE_RATE)
    return flat[:n_frames, :]


def run_basic_pitch(
    samples: NDArray[np.float32],
) -> tuple[NDArray[np.float32], NDArray[np.float32], NDArray[np.float32]]:
    """Run Basic Pitch ONNX inference, returning `(frames, onsets, contours)` matrices."""
    windows = window_signal(samples)
    session = _session()
    batches: tuple[list[NDArray[np.float32]], ...] = ([], [], [])
    for idx in range(len(windows)):
        outputs = session.run(OUTPUT_NAMES, {INPUT_NAME: windows[idx : idx + 1]})
        for bucket, tensor in zip(batches, outputs, strict=True):
            bucket.append(np.asarray(tensor, dtype=np.float32))
    total = len(samples)
    return (
        unwrap_frames(np.concatenate(batches[0], axis=0), total),
        unwrap_frames(np.concatenate(batches[1], axis=0), total),
        unwrap_frames(np.concatenate(batches[2], axis=0), total),
    )
