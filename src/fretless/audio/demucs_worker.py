"""Persistent Hybrid Demucs neural stem-separation worker (HDEMUCS_HIGH_MUSDB_PLUS)."""

import importlib
import os
import struct
import sys
from collections.abc import Callable
from typing import Any, BinaryIO

import numpy as np
from numpy.typing import NDArray

DEMUCS_SAMPLE_RATE = 44100
_CHUNK_SAMPLES = DEMUCS_SAMPLE_RATE * 10
_OVERLAP_SAMPLES = DEMUCS_SAMPLE_RATE
_STEP_SAMPLES = _CHUNK_SAMPLES - _OVERLAP_SAMPLES
_BATCH_SIZE = 4
_HEADER = struct.Struct("<QQ")

StemTriple = tuple[NDArray[np.float32], NDArray[np.float32], NDArray[np.float32]]
SeparatorFn = Callable[[NDArray[np.float32]], StemTriple]


def _read_exact(stream: BinaryIO, size: int) -> bytes:
    buf = bytearray()
    while len(buf) < size:
        chunk = stream.read(size - len(buf))
        if not chunk:
            return b""
        buf.extend(chunk)
    return bytes(buf)


def _write_frame(stream: BinaryIO, status: int, payload: bytes) -> None:
    stream.write(struct.pack("<BQ", status, len(payload)))
    stream.write(payload)
    stream.flush()


def _chunk_starts(total: int) -> list[int]:
    if total <= _CHUNK_SAMPLES:
        return [0]
    starts = list(range(0, total, _STEP_SAMPLES))
    while len(starts) > 1 and total - starts[-1] <= _OVERLAP_SAMPLES:
        starts.pop()
    return starts


def _stack_chunks(stereo: NDArray[np.float32], starts: list[int]) -> NDArray[np.float32]:
    batch = np.zeros((len(starts), 2, _CHUNK_SAMPLES), dtype=np.float32)
    total = int(stereo.shape[1])
    for idx, start in enumerate(starts):
        end = min(total, start + _CHUNK_SAMPLES)
        batch[idx, :, : end - start] = stereo[:, start:end]
    return batch


def _overlap_add(outs: NDArray[np.float32], starts: list[int], total: int) -> NDArray[np.float32]:
    n_sources = outs.shape[1]
    acc = np.zeros((n_sources, 2, total), dtype=np.float32)
    weights = np.zeros(total, dtype=np.float32)
    fade = np.linspace(0.0, 1.0, _OVERLAP_SAMPLES, dtype=np.float32)
    for idx, start in enumerate(starts):
        end = min(total, start + _CHUNK_SAMPLES)
        length = end - start
        win = np.ones(length, dtype=np.float32)
        if start > 0 and length > _OVERLAP_SAMPLES:
            win[:_OVERLAP_SAMPLES] *= fade
        if end < total and length > _OVERLAP_SAMPLES:
            win[-_OVERLAP_SAMPLES:] *= fade[::-1]
        acc[:, :, start:end] += outs[idx, :, :, :length] * win
        weights[start:end] += win
    return (acc / np.maximum(weights, 1e-6)).astype(np.float32)


def _infer_numpy_batches(
    batch: NDArray[np.float32],
    run_slice: Callable[[NDArray[np.float32]], NDArray[np.float32]],
    size: int,
) -> NDArray[np.float32]:
    pieces = [run_slice(batch[pos : pos + size]) for pos in range(0, len(batch), size)]
    return np.concatenate(pieces, axis=0)


def build_demucs_separator() -> SeparatorFn:
    """Load Torchaudio HDemucs once onto CUDA (or CPU) and return a callable separator."""
    os.environ.setdefault("TORCH_HOME", os.path.expanduser("~/.cache/torch"))
    torch: Any = importlib.import_module("torch")
    torchaudio: Any = importlib.import_module("torchaudio")
    bundle = torchaudio.pipelines.HDEMUCS_HIGH_MUSDB_PLUS
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = bundle.get_model().to(device).eval()
    source_idx = {name: i for i, name in enumerate(model.sources)}

    def run_slice(part: NDArray[np.float32]) -> NDArray[np.float32]:
        with torch.inference_mode():
            tensor = torch.from_numpy(np.ascontiguousarray(part, dtype=np.float32)).to(device)
            return np.asarray(model(tensor).cpu().numpy(), dtype=np.float32)

    def separate(stereo: NDArray[np.float32]) -> StemTriple:
        total = int(stereo.shape[1]) if stereo.ndim == 2 else 0
        if total == 0 or float(np.max(np.abs(stereo))) == 0.0:
            zeros = np.zeros((2, total), dtype=np.float32)
            return zeros, zeros.copy(), zeros.copy()
        starts = _chunk_starts(total)
        batch = _stack_chunks(stereo, starts)
        try:
            outs = _infer_numpy_batches(batch, run_slice, _BATCH_SIZE)
        except RuntimeError:
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            outs = _infer_numpy_batches(batch, run_slice, 1)
        stems = _overlap_add(outs, starts, total)
        return stems[source_idx["vocals"]], stems[source_idx["other"]], stems[source_idx["bass"]]

    return separate


def _handle_request(in_pipe: BinaryIO, out_pipe: BinaryIO, separate: SeparatorFn) -> bool:
    header = _read_exact(in_pipe, _HEADER.size)
    if not header:
        return False
    channels, n_samples = _HEADER.unpack(header)
    if n_samples == 0:
        return False
    raw = _read_exact(in_pipe, int(channels) * int(n_samples) * 4)
    if not raw:
        return False
    stereo = np.frombuffer(raw, dtype=np.float32).reshape(int(channels), int(n_samples)).copy()
    try:
        vocals, instruments, bass = separate(stereo)
        stacked = np.ascontiguousarray(np.stack([vocals, instruments, bass], axis=0), np.float32)
        _write_frame(out_pipe, 0, stacked.tobytes())
    except (RuntimeError, ValueError, OSError) as err:
        _write_frame(out_pipe, 1, str(err).encode("utf-8"))
    return True


def main() -> None:
    """Serve continuous length-prefixed binary stereo separation requests on stdin/stdout."""
    in_pipe = sys.stdin.buffer
    out_pipe = sys.stdout.buffer
    sys.stdout = sys.stderr
    separate = build_demucs_separator()
    _write_frame(out_pipe, 0, b"READY")
    while _handle_request(in_pipe, out_pipe, separate):
        pass


if __name__ == "__main__":
    main()
