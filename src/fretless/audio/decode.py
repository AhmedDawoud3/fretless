"""Decode uploaded audio bytes (MP3, WAV, OGG, FLAC) into 22.05 kHz mono and 44.1 kHz stereo."""

import io

import numpy as np
import soundfile as sf
from numpy.typing import NDArray

SAMPLE_RATE = 22050
SEP_SAMPLE_RATE = 44100
MAX_DURATION_SECONDS = 360.0
_FILTER_HALF_TAPS = 16


def _lowpass_for_downsample(
    mono: NDArray[np.float32], source_rate: int, target_rate: int
) -> NDArray[np.float32]:
    if target_rate >= source_rate or mono.size == 0:
        return mono
    cutoff = 0.45 * (target_rate / source_rate)
    idx = np.arange(-_FILTER_HALF_TAPS, _FILTER_HALF_TAPS + 1, dtype=np.float64)
    kernel = np.sinc(2.0 * cutoff * idx) * np.blackman(2 * _FILTER_HALF_TAPS + 1)
    kernel /= np.sum(kernel)
    return np.convolve(mono, kernel.astype(np.float32), mode="same").astype(np.float32)


def resample_audio(
    mono: NDArray[np.float32], source_rate: int, target_rate: int = SAMPLE_RATE
) -> NDArray[np.float32]:
    """Anti-aliased Blackman-sinc resample of 1D float32 `mono` to `target_rate`."""
    if source_rate == target_rate or mono.size == 0:
        return mono.astype(np.float32, copy=False)
    filtered = _lowpass_for_downsample(mono, source_rate, target_rate)
    target_length = max(1, round(len(filtered) * target_rate / source_rate))
    source_x = np.linspace(0.0, len(filtered) - 1, num=len(filtered), dtype=np.float64)
    target_x = np.linspace(0.0, len(filtered) - 1, num=target_length, dtype=np.float64)
    return np.interp(target_x, source_x, filtered).astype(np.float32)


def _resample(mono: NDArray[np.float32], source_rate: int) -> NDArray[np.float32]:
    return resample_audio(mono, source_rate, SAMPLE_RATE)


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


def _stereo_at_rate(
    data: NDArray[np.float32], source_rate: int, target_rate: int
) -> NDArray[np.float32]:
    if data.shape[1] >= 2:
        left = resample_audio(data[:, 0], source_rate, target_rate)
        right = resample_audio(data[:, 1], source_rate, target_rate)
        return np.stack([left, right], axis=0).astype(np.float32)
    mono = resample_audio(data[:, 0], source_rate, target_rate)
    return np.stack([mono, mono], axis=0).astype(np.float32)


def _decode_at_rate(
    raw: bytes, target_rate: int
) -> tuple[NDArray[np.float32], NDArray[np.float32]]:
    data, sample_rate = _read_audio(raw)
    stereo = _stereo_at_rate(data, sample_rate, target_rate)
    mono = (0.5 * (stereo[0] + stereo[1])).astype(np.float32)
    return mono, stereo


def decode_audio_mix(raw: bytes) -> tuple[NDArray[np.float32], NDArray[np.float32]]:
    """Decode `raw` bytes into `(mono_22k, stereo_44k)` for Basic Pitch and neural stem split."""
    mono_44k, stereo_44k = _decode_at_rate(raw, SEP_SAMPLE_RATE)
    return resample_audio(mono_44k, SEP_SAMPLE_RATE, SAMPLE_RATE), stereo_44k


def decode_audio_stereo(raw: bytes) -> tuple[NDArray[np.float32], NDArray[np.float32]]:
    """Decode `raw` audio bytes into `(mono, stereo_2ch)` float32 arrays at `SAMPLE_RATE`."""
    return _decode_at_rate(raw, SAMPLE_RATE)


def decode_audio(raw: bytes) -> NDArray[np.float32]:
    """Decode `raw` audio bytes into mono `SAMPLE_RATE` float32 samples, validating length."""
    return decode_audio_stereo(raw)[0]
