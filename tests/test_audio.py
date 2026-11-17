import base64
import io

import numpy as np
import soundfile as sf
from fastapi.testclient import TestClient

from fretless.api import app
from fretless.audio.arrange import arrange_notes, extract_monophonic_line, group_chords
from fretless.audio.decode import (
    MAX_DURATION_SECONDS,
    SAMPLE_RATE,
    SEP_SAMPLE_RATE,
    decode_audio,
    decode_audio_mix,
    decode_audio_stereo,
    resample_audio,
)
from fretless.audio.demucs_bridge import has_neural_separator
from fretless.audio.notes import DetectedNote, extract_notes
from fretless.audio.separate import (
    encode_stem_audio,
    encode_wav_base64,
    gate_bleed,
    separate_mix,
    separate_stems,
)
from fretless.audio.tempo import detect_audio_bpm
from fretless.tab.model import TextBlock
from fretless.tab.oud_render import render_converted
from fretless.tuning import TUNINGS

client = TestClient(app)


def _wav_bytes(samples: np.ndarray, sample_rate: int = SAMPLE_RATE) -> bytes:
    buf = io.BytesIO()
    sf.write(buf, samples, sample_rate, format="WAV", subtype="PCM_16")
    return buf.getvalue()


def _plucked_tone(hz: float, seconds: float = 0.45, sample_rate: int = SAMPLE_RATE) -> np.ndarray:
    t = np.arange(int(sample_rate * seconds), dtype=np.float32) / sample_rate
    env = np.minimum(1.0, t / 0.01) * np.exp(-3.0 * t)
    wave = 0.45 * (np.sin(2 * np.pi * hz * t) + 0.3 * np.sin(4 * np.pi * hz * t))
    return (wave * env).astype(np.float32)


def test_decode_audio_handles_mono_stereo_resampling_and_errors() -> None:
    mono = _plucked_tone(220.0, 0.25, SAMPLE_RATE)
    decoded = decode_audio(_wav_bytes(mono, SAMPLE_RATE))
    assert decoded.dtype == np.float32
    assert decoded.ndim == 1
    assert len(decoded) == len(mono)

    stereo_44k = np.column_stack(
        [_plucked_tone(220.0, 0.2, 44100), np.zeros(8820, dtype=np.float32)]
    )
    resampled = decode_audio(_wav_bytes(stereo_44k, 44100))
    assert resampled.ndim == 1
    assert abs(len(resampled) - int(0.2 * SAMPLE_RATE)) <= 2

    for bad in (b"", b"not an audio file"):
        try:
            decode_audio(bad)
        except ValueError:
            pass
        else:
            raise AssertionError(f"expected ValueError for {bad!r}")

    too_long = np.zeros(int(SAMPLE_RATE * (MAX_DURATION_SECONDS + 1)), dtype=np.float32)
    try:
        decode_audio(_wav_bytes(too_long, SAMPLE_RATE))
    except ValueError:
        pass
    else:
        raise AssertionError("expected ValueError for audio over max duration")

    t_44 = np.arange(SEP_SAMPLE_RATE, dtype=np.float32) / SEP_SAMPLE_RATE
    ultrasonic = (0.5 * np.sin(2 * np.pi * 16_000.0 * t_44)).astype(np.float32)
    down = resample_audio(ultrasonic, SEP_SAMPLE_RATE, SAMPLE_RATE)
    assert float(np.sqrt(np.mean(down**2))) < 0.02

    mono_22k, stereo_44k = decode_audio_mix(_wav_bytes(stereo_44k, 44100))
    assert mono_22k.ndim == 1
    assert stereo_44k.shape[0] == 2


def test_extract_notes_detects_quarter_tone_from_contour_bend() -> None:
    n_frames = 40
    frames = np.zeros((n_frames, 88), dtype=np.float32)
    onsets = np.zeros((n_frames, 88), dtype=np.float32)
    contours = np.zeros((n_frames, 264), dtype=np.float32)

    # Note 1: C4 (MIDI 60 -> freq_idx 39, pitch 96) with zero contour offset (bin 3*39+1 = 118)
    onsets[2, 39] = 0.9
    frames[2:12, 39] = 0.8
    contours[2:12, 3 * 39 + 1] = 0.95

    # Note 2: E4 (MIDI 64 -> freq_idx 43) bent down 2 contour bins -> Ed4 (pitch 103, odd step!)
    onsets[18, 43] = 0.85
    frames[18:30, 43] = 0.75
    contours[18:30, (3 * 43 + 1) - 2] = 0.9

    # Too short note (2 frames) should be filtered out
    onsets[34, 44] = 0.9
    frames[34:36, 44] = 0.8

    notes = extract_notes(frames, onsets, contours, onset_threshold=0.5, frame_threshold=0.3)
    assert [n.pitch for n in notes] == [96, 103]
    assert notes[0].start_seconds < notes[1].start_seconds
    assert notes[1].duration_seconds > 0


def test_arrange_notes_places_single_notes_and_chords() -> None:
    tuning = TUNINGS["cc"]
    assert group_chords(()) == ()
    empty_in, empty_conv = arrange_notes((), tuning)
    assert empty_in == 0
    assert empty_conv.blocks == ()

    sample = (
        DetectedNote(0.10, 0.4, 96, 0.8),
        DetectedNote(0.12, 0.4, 86, 0.7),  # within chord window -> chord
        DetectedNote(0.80, 0.4, 103, 0.75),  # Ed4 quarter tone
    )
    notes_in, converted = arrange_notes(sample, tuning)
    assert notes_in == 3
    text = render_converted(converted, tuning, "frets")
    assert "C|" in text
    assert ".5" in text

    long_phrase = tuple(DetectedNote(i * 0.6, 0.4, 96, 0.8) for i in range(18))
    _, wrapped = arrange_notes(long_phrase, tuning)
    assert any(isinstance(b, TextBlock) for b in wrapped.blocks)


def test_audio_transcribe_endpoint_end_to_end_and_errors() -> None:
    c4_hz = 440.0 * 2.0 ** ((96 - 114) / 24.0)
    g3_hz = 440.0 * 2.0 ** ((86 - 114) / 24.0)
    signal = np.concatenate([_plucked_tone(c4_hz, 0.5), _plucked_tone(g3_hz, 0.5)])
    encoded = base64.b64encode(_wav_bytes(signal, SAMPLE_RATE)).decode("ascii")

    res = client.post(
        "/api/audio/transcribe",
        json={"audio_base64": encoded, "oud_tuning": "cc", "mode": "both"},
    )
    assert res.status_code == 200
    body = res.json()
    assert len(body["systems"]) >= 1
    assert body["summary"]["notes_out"] >= 2
    assert len(body["playback"]) >= 2
    assert "C|" in body["text"]
    assert body["tempo"] >= 60
    assert len(body["arrangements"]) >= 1
    assert body["active_arrangement_id"] == body["arrangements"][0]["id"]
    assert body["arrangements"][0]["fit_score"] >= 1
    assert body["arrangements"][0]["audio_base64"]
    assert len(body["detected_maqam"]) >= 1

    assert (
        client.post(
            "/api/audio/transcribe",
            json={"audio_base64": "not-valid-base64!!!", "oud_tuning": "cc"},
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/audio/transcribe",
            json={"audio_base64": encoded, "oud_tuning": "nope"},
        ).status_code
        == 404
    )


def test_stem_separation_tempo_and_monophonic_filtering() -> None:
    t = np.arange(SAMPLE_RATE, dtype=np.float32) / SAMPLE_RATE
    bass_sig = 0.5 * np.sin(2 * np.pi * 110.0 * t).astype(np.float32)
    vocal_sig = 0.5 * np.sin(2 * np.pi * 440.0 * t).astype(np.float32)
    side_sig = 0.4 * np.sin(2 * np.pi * 1200.0 * t).astype(np.float32)
    left = bass_sig + vocal_sig + side_sig
    right = bass_sig + vocal_sig - side_sig
    wav = _wav_bytes(np.column_stack([left, right]).astype(np.float32), SAMPLE_RATE)

    mono, stereo = decode_audio_stereo(wav)
    stems = separate_stems(mono, stereo)
    assert len(stems.vocals) == len(mono)
    assert float(np.sqrt(np.mean(stems.bass**2))) > 0.05
    assert float(np.sqrt(np.mean(stems.vocals**2))) > 0.05
    assert len(base64.b64decode(encode_wav_base64(stems.vocals))) > 100

    pulse = tuple(DetectedNote(i * 0.5, 0.3, 96, 0.8) for i in range(6))
    assert detect_audio_bpm(pulse) == 120

    crowded = (
        DetectedNote(0.1, 0.5, 96, 0.4),
        DetectedNote(0.11, 0.5, 108, 0.9),
        DetectedNote(0.6, 0.4, 100, 0.85),
    )
    solo = extract_monophonic_line(crowded, "loudest")
    assert [n.pitch for n in solo] == [108, 100]

    bleed = np.full(SAMPLE_RATE, 0.002, dtype=np.float32)
    bleed[5000:12000] = 0.5 * np.sin(2 * np.pi * 440.0 * np.arange(7000) / SAMPLE_RATE)
    gated = gate_bleed(bleed, mix_rms=0.25)
    assert float(np.max(np.abs(gated[16000:]))) == 0.0
    assert float(np.sqrt(np.mean(gated[6000:11000] ** 2))) > 0.2

    stereo_pair = np.stack([vocal_sig, -vocal_sig], axis=0).astype(np.float32)
    stem_b64 = encode_stem_audio(stereo_pair, SAMPLE_RATE)
    assert len(base64.b64decode(stem_b64)) > 200


def test_neural_stem_separation_or_clean_fallback() -> None:
    t = np.arange(SEP_SAMPLE_RATE, dtype=np.float32) / SEP_SAMPLE_RATE
    vocal = (0.4 * np.sin(2 * np.pi * 440.0 * t)).astype(np.float32)
    bass = (0.4 * np.sin(2 * np.pi * 110.0 * t)).astype(np.float32)
    mix_stereo = np.stack([vocal + bass, vocal + bass], axis=0).astype(np.float32)
    mono_22k = resample_audio(vocal + bass, SEP_SAMPLE_RATE, SAMPLE_RATE)
    separated = separate_mix(mono_22k, mix_stereo, stereo_rate=SEP_SAMPLE_RATE)
    assert len(separated.vocals) == len(mono_22k)
    assert separated.neural == has_neural_separator()
