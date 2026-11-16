"""Separate mixed audio into harmonic vocal, instrument, and bass stems and encode previews."""

import base64
import io
from dataclasses import dataclass

import numpy as np
import soundfile as sf
from numpy.lib.stride_tricks import sliding_window_view
from numpy.typing import NDArray

from fretless.audio.decode import SAMPLE_RATE

_N_FFT = 1024
_HOP = 256
_MEDIAN_RADIUS = 7


@dataclass(frozen=True)
class SeparatedStems:
    vocals: NDArray[np.float32]
    instruments: NDArray[np.float32]
    bass: NDArray[np.float32]


def _stft(signal: NDArray[np.float32]) -> NDArray[np.complex64]:
    pad = _N_FFT // 2
    padded = np.pad(signal, (pad, pad + _N_FFT))
    frames = sliding_window_view(padded, _N_FFT)[::_HOP]
    n_needed = 1 + (len(signal) + _HOP - 1) // _HOP
    window = np.hanning(_N_FFT).astype(np.float32)
    return np.fft.rfft(frames[:n_needed] * window, axis=1).T.astype(np.complex64)


def _istft(spec: NDArray[np.complex64], length: int) -> NDArray[np.float32]:
    window = np.hanning(_N_FFT).astype(np.float32)
    frames = np.fft.irfft(spec.T, n=_N_FFT, axis=1).astype(np.float32) * window
    out_len = (frames.shape[0] - 1) * _HOP + _N_FFT
    out = np.zeros(out_len, dtype=np.float32)
    norm = np.zeros(out_len, dtype=np.float32)
    win_sq = window * window
    for idx, frame in enumerate(frames):
        at = idx * _HOP
        out[at : at + _N_FFT] += frame
        norm[at : at + _N_FFT] += win_sq
    pad = _N_FFT // 2
    trimmed = out[pad : pad + length] / np.maximum(norm[pad : pad + length], 1e-6)
    return trimmed.astype(np.float32)


def _median_1d(mag: NDArray[np.float32], radius: int, axis: int) -> NDArray[np.float32]:
    pad_spec = ((0, 0), (radius, radius)) if axis == 1 else ((radius, radius), (0, 0))
    padded = np.pad(mag, pad_spec, mode="edge")
    win = 2 * radius + 1
    if axis == 1:
        view = sliding_window_view(padded, win, axis=1)
        return np.median(view, axis=2).astype(np.float32)
    view = sliding_window_view(padded, win, axis=0)
    return np.median(view, axis=2).astype(np.float32)


def _center_focus(
    stereo: NDArray[np.float32] | None, shape: tuple[int, int]
) -> NDArray[np.float32]:
    if stereo is None or stereo.shape[0] < 2 or np.allclose(stereo[0], stereo[1]):
        return np.ones(shape, dtype=np.float32)
    mid = np.abs(_stft(0.5 * (stereo[0] + stereo[1])))
    side = np.abs(_stft(0.5 * (stereo[0] - stereo[1])))
    return (mid**2 / (mid**2 + 0.8 * side**2 + 1e-8)).astype(np.float32)


def _band_mask(freqs: NDArray[np.float32], low_hz: float, high_hz: float) -> NDArray[np.float32]:
    fade_lo = np.clip((freqs - low_hz * 0.7) / max(1.0, low_hz * 0.6), 0.0, 1.0)
    fade_hi = np.clip((high_hz * 1.3 - freqs) / max(1.0, high_hz * 0.5), 0.0, 1.0)
    return (fade_lo * fade_hi)[:, np.newaxis].astype(np.float32)


def separate_stems(
    mono: NDArray[np.float32], stereo: NDArray[np.float32] | None = None
) -> SeparatedStems:
    """Split `mono`/`stereo` mix into drum-suppressed `vocals`, `instruments`, and `bass` stems."""
    if len(mono) < _HOP:
        empty = mono.astype(np.float32)
        return SeparatedStems(empty, empty, empty)
    spec = _stft(mono)
    mag = np.abs(spec).astype(np.float32)
    h_spec = _median_1d(mag, _MEDIAN_RADIUS, axis=1) ** 2
    p_spec = _median_1d(mag, _MEDIAN_RADIUS, axis=0) ** 2
    harmonic = (h_spec / (h_spec + p_spec + 1e-8)).astype(np.float32)

    freqs = np.fft.rfftfreq(_N_FFT, 1.0 / SAMPLE_RATE).astype(np.float32)
    bass_m = _band_mask(freqs, 30.0, 260.0) * harmonic
    vocal_focus = _band_mask(freqs, 160.0, 3200.0) * _center_focus(stereo, mag.shape) * harmonic
    inst_m = (
        _band_mask(freqs, 120.0, SAMPLE_RATE / 2.0)
        * np.clip(1.0 - 0.65 * vocal_focus, 0.2, 1.0)
        * harmonic
    )

    n = len(mono)
    return SeparatedStems(
        vocals=_istft(spec * vocal_focus, n),
        instruments=_istft(spec * inst_m, n),
        bass=_istft(spec * bass_m, n),
    )


def encode_wav_base64(samples: NDArray[np.float32], target_rate: int = 11025) -> str:
    """Downsample `samples` into a compact mono 16-bit WAV encoded as base64."""
    step = max(1, SAMPLE_RATE // target_rate)
    reduced = samples[::step].astype(np.float32)
    peak = float(np.max(np.abs(reduced))) if reduced.size else 0.0
    if peak > 0.98:
        reduced = reduced * (0.95 / peak)
    buf = io.BytesIO()
    sf.write(buf, reduced, SAMPLE_RATE // step, format="WAV", subtype="PCM_16")
    return base64.b64encode(buf.getvalue()).decode("ascii")
