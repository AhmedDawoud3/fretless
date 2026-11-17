"""Bridge audio separation to Torchaudio Hybrid Demucs (in-process or persistent CUDA worker)."""

import atexit
import glob
import importlib.util
import os
import shutil
import struct
import subprocess
import sys
import threading
from functools import cache
from pathlib import Path
from typing import IO, BinaryIO, cast

import numpy as np
from numpy.typing import NDArray

from fretless.audio.demucs_worker import (
    SeparatorFn,
    StemTriple,
    _read_exact,
    build_demucs_separator,
)

_WORKER_SCRIPT = Path(__file__).with_name("demucs_worker.py")
_REQ_HEADER = struct.Struct("<QQ")
_RESP_HEADER = struct.Struct("<BQ")
_PROBE_CODE = (
    "import torch, torchaudio; assert hasattr(torchaudio.pipelines, 'HDEMUCS_HIGH_MUSDB_PLUS')"
)


def _in_process_available() -> bool:
    return (
        importlib.util.find_spec("torch") is not None
        and importlib.util.find_spec("torchaudio") is not None
    )


def _add_candidate(candidates: list[str], seen: set[str], current: str, raw_path: str) -> None:
    path = Path(raw_path)
    if not path.is_file():
        return
    resolved = str(path.resolve()).lower()
    if resolved == current or resolved in seen or "windowsapps" in resolved:
        return
    seen.add(resolved)
    candidates.append(str(path))


def _candidate_pythons() -> list[str]:
    raw_list: list[str] = []
    if custom := os.environ.get("FRETLESS_DEMUCS_PYTHON"):
        raw_list.append(custom)
    if local_app := os.environ.get("LOCALAPPDATA"):
        pattern = str(Path(local_app) / "Programs" / "Python" / "Python3*" / "python.exe")
        raw_list.extend(sorted(glob.glob(pattern), reverse=True))
    for cmd in ("python3", "python"):
        if found := shutil.which(cmd):
            raw_list.append(found)
    seen: set[str] = set()
    current = str(Path(sys.executable).resolve()).lower()
    unique: list[str] = []
    for item in raw_list:
        _add_candidate(unique, seen, current, item)
    return unique


def _probe_python(exe: str) -> bool:
    try:
        res = subprocess.run([exe, "-c", _PROBE_CODE], capture_output=True, timeout=20, check=False)
    except (OSError, subprocess.SubprocessError):
        return False
    return res.returncode == 0


@cache
def _discover_worker_python() -> str | None:
    for exe in _candidate_pythons():
        if _probe_python(exe):
            return exe
    return None


@cache
def _in_process_separator() -> SeparatorFn:
    return build_demucs_separator()


def _read_frame(stream: IO[bytes] | None) -> tuple[int, bytes]:
    if stream is None:
        raise OSError("worker stdout closed")
    header = _read_exact(cast(BinaryIO, stream), _RESP_HEADER.size)
    if not header:
        raise EOFError("worker closed stdout")
    status, size = _RESP_HEADER.unpack(header)
    payload = _read_exact(cast(BinaryIO, stream), size)
    if len(payload) != size:
        raise EOFError("truncated response frame from demucs worker")
    return status, payload


class _DemucsWorkerClient:
    def __init__(self, exe: str) -> None:
        self._exe = exe
        self._lock = threading.Lock()
        self._proc: subprocess.Popen[bytes] | None = None
        atexit.register(self.close)

    def _ensure_started(self) -> subprocess.Popen[bytes]:
        if self._proc is not None and self._proc.poll() is None:
            return self._proc
        self._proc = subprocess.Popen(
            [self._exe, "-u", str(_WORKER_SCRIPT)],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
        )
        status, payload = _read_frame(self._proc.stdout)
        if status != 0 or payload != b"READY":
            self.close()
            raise RuntimeError(f"demucs worker failed startup: {payload!r}")
        return self._proc

    def _exchange(self, stereo: NDArray[np.float32]) -> StemTriple:
        proc = self._ensure_started()
        if proc.stdin is None:
            raise OSError("worker stdin closed")
        n_samples = int(stereo.shape[1])
        data = np.ascontiguousarray(stereo, dtype=np.float32)
        proc.stdin.write(_REQ_HEADER.pack(2, n_samples))
        proc.stdin.write(data.tobytes())
        proc.stdin.flush()
        status, payload = _read_frame(proc.stdout)
        if status != 0:
            raise RuntimeError(payload.decode("utf-8", errors="replace"))
        arr = np.frombuffer(payload, dtype=np.float32).reshape(3, 2, n_samples).copy()
        return arr[0], arr[1], arr[2]

    def separate(self, stereo: NDArray[np.float32]) -> StemTriple:
        with self._lock:
            try:
                return self._exchange(stereo)
            except (EOFError, BrokenPipeError, OSError):
                self.close()
                return self._exchange(stereo)

    def close(self) -> None:
        proc = self._proc
        self._proc = None
        if proc is None:
            return
        if proc.stdin is not None:
            proc.stdin.close()
        if proc.stdout is not None:
            proc.stdout.close()
        try:
            proc.wait(timeout=2)
        except subprocess.TimeoutExpired:
            proc.kill()


@cache
def _worker_client(exe: str) -> _DemucsWorkerClient:
    return _DemucsWorkerClient(exe)


def has_neural_separator() -> bool:
    """Return True when PyTorch/Torchaudio HDemucs is usable (in-process or worker)."""
    if os.environ.get("FRETLESS_DISABLE_DEMUCS") == "1":
        return False
    return _in_process_available() or _discover_worker_python() is not None


def separate_with_demucs(stereo_44k: NDArray[np.float32]) -> StemTriple | None:
    """Separate `44100 Hz` `(2, N)` stereo audio with Hybrid Demucs, or None if unavailable."""
    if os.environ.get("FRETLESS_DISABLE_DEMUCS") == "1":
        return None
    if _in_process_available():
        return _in_process_separator()(stereo_44k)
    exe = _discover_worker_python()
    if exe is None:
        return None
    return _worker_client(exe).separate(stereo_44k)
