"""Decode uploaded audio bytes (MP3, WAV, OGG, FLAC) into mono 22.05 kHz float32 samples."""

import io

import numpy as np
import soundfile as sf
from numpy.typing import NDArray

SAMPLE_RATE = 22050
MAX_DURATION_SECONDS = 180.0


def _resample(mono: NDArray[np.float32], source_rate: int) -> NDArray[np.float32]:
    if source_rate == SAMPLE_RATE:
        return mono
    target_length = max(1, round(len(mono) * SAMPLE_RATE / source_rate))
    source_x = np.linspace(0.0, len(mono) - 1, num=len(mono), dtype=np.float64)
    target_x = np.linspace(0.0, len(mono) - 1, num=target_length, dtype=np.float64)
    return np.interp(target_x, source_x, mono).astype(np.float32)


def _read_audio(raw: bytes) -> tuple[NDArray[np.float32], int]:
    if not raw:
        raise ValueError("audio file is empty")
    try:
        data, sample_rate = sf.read(io.BytesIO(raw), dtype="float32", always_2d=True)
    except (sf.LibsndfileError, RuntimeError, ValueError, OSError) as err:
        raise ValueError(f"could not decode audio: {err}") from err
    if data.size == 0:
        raise ValueError("audio file contains no samples")
    if data.shape[0] / sample_rate > MAX_DURATION_SECONDS:
        raise ValueError(f"audio exceeds {int(MAX_DURATION_SECONDS)} seconds")
    return np.asarray(data, dtype=np.float32), int(sample_rate)


def decode_audio_stereo(raw: bytes) -> tuple[NDArray[np.float32], NDArray[np.float32]]:
    """Decode `raw` audio bytes into `(mono, stereo_2ch)` float32 arrays at `SAMPLE_RATE`."""
    data, sample_rate = _read_audio(raw)
    if data.shape[1] >= 2:
        left = _resample(data[:, 0], sample_rate)
        right = _resample(data[:, 1], sample_rate)
        stereo = np.stack([left, right], axis=0).astype(np.float32)
        return (0.5 * (left + right)).astype(np.float32), stereo
    mono = _resample(data[:, 0], sample_rate)
    return mono, np.stack([mono, mono], axis=0).astype(np.float32)


def decode_audio(raw: bytes) -> NDArray[np.float32]:
    """Decode `raw` audio bytes into mono `SAMPLE_RATE` float32 samples, validating length."""
    return decode_audio_stereo(raw)[0]
