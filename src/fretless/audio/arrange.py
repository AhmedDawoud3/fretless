"""Group, de-crowd, score, and arrange separated audio stems onto the oud."""

from collections import defaultdict
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Literal

import numpy as np
from numpy.typing import NDArray

from fretless.audio.decode import SAMPLE_RATE, SEP_SAMPLE_RATE
from fretless.audio.inference import run_basic_pitch
from fretless.audio.notes import DetectedNote, extract_notes
from fretless.audio.separate import encode_stem_audio, separate_mix
from fretless.audio.tempo import detect_audio_bpm, ticks_per_second_for_bpm
from fretless.pitch import STEPS_PER_OCTAVE
from fretless.tab import alterations as note
from fretless.tab.convert import PlacedEvent, place_events
from fretless.tab.convert_model import (
    Alteration,
    Converted,
    ConvertedBlock,
    PlacedColumn,
    PlacedNote,
    PlacedSystem,
)
from fretless.tab.events import Event
from fretless.tab.model import TextBlock
from fretless.tuning import Tuning

CHORD_WINDOW_SECONDS = 0.06
TICKS_PER_SECOND = 6
MIN_COLUMN_GAP = 3
SYSTEM_WIDTH = 48
SYSTEM_BARS = (12, 24, 36)
BEAT_SYSTEM_BARS = (16, 32)


@dataclass(frozen=True)
class AudioArrangement:
    id: str
    label: str
    stem: str
    fit_score: int
    fit_reason: str
    notes_in: int
    converted: Converted
    audio_base64: str | None = None


def _note_clusters(notes: tuple[DetectedNote, ...]) -> list[tuple[float, list[DetectedNote]]]:
    clusters: list[tuple[float, list[DetectedNote]]] = []
    for item in sorted(notes, key=lambda n: (n.start_seconds, -n.pitch)):
        if not clusters or item.start_seconds - clusters[-1][0] > CHORD_WINDOW_SECONDS:
            clusters.append((item.start_seconds, [item]))
        else:
            clusters[-1][1].append(item)
    return clusters


def group_chords(notes: tuple[DetectedNote, ...]) -> tuple[tuple[float, tuple[int, ...]], ...]:
    """Cluster sorted notes starting within `CHORD_WINDOW_SECONDS` into descending pitch sets."""
    if not notes:
        return ()
    return tuple(
        (start, tuple(sorted({n.pitch for n in group}, reverse=True)))
        for start, group in _note_clusters(notes)
    )


def extract_monophonic_line(
    notes: tuple[DetectedNote, ...],
    prefer: Literal["high", "low", "loudest"] = "loudest",
) -> tuple[DetectedNote, ...]:
    """Reduce each onset cluster to a single melodic note, stripping chord overtones."""
    key_fn = {
        "loudest": lambda n: (n.amplitude, n.pitch),
        "high": lambda n: (float(n.pitch), n.amplitude),
        "low": lambda n: (float(-n.pitch), n.amplitude),
    }[prefer]
    return tuple(max(group, key=key_fn) for _, group in _note_clusters(notes))


def extract_sparse_chords(
    notes: tuple[DetectedNote, ...], max_polyphony: int = 3
) -> tuple[DetectedNote, ...]:
    """Keep strongest distinct pitch-class notes per cluster up to `max_polyphony`."""
    kept: list[DetectedNote] = []
    for _, group in _note_clusters(notes):
        peak = max(n.amplitude for n in group)
        by_pc: dict[int, DetectedNote] = {}
        for item in sorted(group, key=lambda n: -n.amplitude):
            if item.amplitude < 0.45 * peak:
                continue
            pc = item.pitch % STEPS_PER_OCTAVE
            if pc not in by_pc:
                by_pc[pc] = item
            if len(by_pc) >= max_polyphony:
                break
        kept.extend(sorted(by_pc.values(), key=lambda n: -n.pitch))
    return tuple(kept)


def combine_vocal_and_bass(
    vocal_notes: tuple[DetectedNote, ...], bass_notes: tuple[DetectedNote, ...]
) -> tuple[DetectedNote, ...]:
    """Pair a monophonic lead vocal line with a monophonic bass line."""
    lead = extract_monophonic_line(vocal_notes, "high")
    bass = extract_monophonic_line(bass_notes, "low")
    return tuple(sorted((*lead, *bass), key=lambda n: (n.start_seconds, -n.pitch)))


def _cluster_timings(
    notes: tuple[DetectedNote, ...], ticks_per_sec: float
) -> tuple[tuple[Event, ...], dict[tuple[int, int], tuple[float, float]]]:
    events: list[Event] = []
    timings: dict[tuple[int, int], tuple[float, float]] = {}
    system, base_tick, prev_col = 0, 0, -MIN_COLUMN_GAP
    for start, group in _note_clusters(notes):
        pitches = tuple(sorted({n.pitch for n in group}, reverse=True))
        dur = max(n.duration_seconds for n in group)
        tick = round(start * ticks_per_sec)
        col = max(prev_col + MIN_COLUMN_GAP, tick - base_tick)
        if col >= SYSTEM_WIDTH - 2:
            system += 1
            base_tick = tick
            col = 0
        prev_col = col
        events.append(Event(system, col, pitches))
        timings[(system, col)] = (start, dur)
    return tuple(events), timings


def _single_note_of(col: PlacedColumn | None) -> PlacedNote | None:
    return col.notes[0] if col is not None and len(col.notes) == 1 else None


def _pair_ornament(
    col: PlacedColumn,
    nxt: PlacedColumn | None,
    start: float,
    dur: float,
    next_start: float | None,
) -> tuple[int, int, str] | None:
    first = _single_note_of(col)
    if first is None:
        return None
    if dur >= 0.45:
        return (first.course, col.index, "~")
    nxt_note = _single_note_of(nxt)
    if nxt_note is None or next_start is None or nxt_note.course != first.course:
        return None
    delta = nxt_note.pitch - first.pitch
    if 0.0 < next_start - start <= 0.25 and 1 <= abs(delta) <= 4:
        return (first.course, col.index, "/" if delta > 0 else "\\")
    return None


def _lead_techniques(
    sys_idx: int,
    columns: list[PlacedColumn],
    timings: dict[tuple[int, int], tuple[float, float]],
) -> tuple[tuple[int, int, str], ...]:
    out: list[tuple[int, int, str]] = []
    for idx, col in enumerate(columns):
        nxt = columns[idx + 1] if idx + 1 < len(columns) else None
        start, dur = timings[(sys_idx, col.index)]
        nxt_start = timings[(sys_idx, nxt.index)][0] if nxt is not None else None
        if (mark := _pair_ornament(col, nxt, start, dur, nxt_start)) is not None:
            out.append(mark)
    return tuple(out)


def _system_block(
    sys_idx: int,
    sys_events: list[Event],
    placed: dict[tuple[int, int], PlacedEvent],
    bars: tuple[int, ...],
    timings: dict[tuple[int, int], tuple[float, float]],
) -> tuple[PlacedSystem, list[Alteration]]:
    columns: list[PlacedColumn] = []
    altered: list[Alteration] = []
    for event in sys_events:
        outcome = placed[(event.system, event.column)]
        columns.append(PlacedColumn(event.column, outcome.notes))
        altered.extend(outcome.alterations)
    tech = _lead_techniques(sys_idx, columns, timings)
    return PlacedSystem(sys_idx, SYSTEM_WIDTH, bars, tuple(columns), tech), altered


def _build_blocks(
    events: tuple[Event, ...],
    placed: dict[tuple[int, int], PlacedEvent],
    shift: int,
    bars: tuple[int, ...],
    timings: dict[tuple[int, int], tuple[float, float]],
) -> tuple[tuple[ConvertedBlock, ...], tuple[Alteration, ...]]:
    by_system: dict[int, list[Event]] = defaultdict(list)
    for event in events:
        by_system[event.system].append(event)
    blocks: list[ConvertedBlock] = []
    altered: list[Alteration] = [note.transposed(shift)] if shift else []
    for sys_idx, sys_events in sorted(by_system.items()):
        if blocks:
            blocks.append(TextBlock(""))
        system_block, more = _system_block(sys_idx, sys_events, placed, bars, timings)
        blocks.append(system_block)
        altered.extend(more)
    return tuple(blocks), tuple(altered)


def arrange_notes(
    notes: tuple[DetectedNote, ...],
    tuning: Tuning,
    *,
    ticks_per_second: float = TICKS_PER_SECOND,
    bars: tuple[int, ...] = SYSTEM_BARS,
) -> tuple[int, Converted]:
    """Place transcribed 24-TET notes onto `tuning` via the tab Viterbi pathfinder."""
    if not notes:
        return 0, Converted((), (), 0)
    events, timings = _cluster_timings(notes, ticks_per_second)
    shift, placed = place_events(events, tuning)
    blocks, altered = _build_blocks(events, placed, shift, bars, timings)
    return len(notes), Converted(blocks, altered, shift)


def score_oud_fit(
    notes_in: int, converted: Converted, duration_seconds: float, *, single_line: bool
) -> tuple[int, str]:
    """Score `0..100` how naturally a converted arrangement sits on the oud."""
    if notes_in == 0:
        return 0, "No notes detected"
    shifted = sum(1 for a in converted.alterations if a.kind == "octave_shifted")
    reduced = sum(1 for a in converted.alterations if a.kind == "chord_reduced")
    direct_pct = round(100 * max(0.0, 1.0 - shifted / notes_in))
    range_score = 38.0 * max(0.0, 1.0 - shifted / notes_in)
    chord_score = 22.0 * max(0.0, 1.0 - reduced / notes_in)
    density = notes_in / max(1.0, duration_seconds)
    density_fit = max(0.2, 1.0 - abs(density - 2.5) / 6.0)
    clarity_score = (28.0 * density_fit) + (12.0 if single_line else 0.0)
    total = max(1, min(99, round(range_score + chord_score + clarity_score)))
    kind_word = "Single-line melody" if single_line else "Polyphonic texture"
    return total, f"{kind_word} · {direct_pct}% direct Oud range fit"


def _detect_wave(
    samples: NDArray[np.float32], onset_threshold: float, frame_threshold: float
) -> tuple[DetectedNote, ...]:
    frames, onsets, contours = run_basic_pitch(samples)
    return extract_notes(
        frames,
        onsets,
        contours,
        onset_threshold=onset_threshold,
        frame_threshold=frame_threshold,
    )


def _arrangement_from_notes(
    arr_id: str,
    label: str,
    stem: str,
    notes: tuple[DetectedNote, ...],
    tuning: Tuning,
    ticks_per_sec: float,
    duration_seconds: float,
    wav_map: dict[str, str],
    *,
    single_line: bool,
) -> AudioArrangement | None:
    if not notes:
        return None
    notes_in, converted = arrange_notes(
        notes, tuning, ticks_per_second=ticks_per_sec, bars=BEAT_SYSTEM_BARS
    )
    score, reason = score_oud_fit(notes_in, converted, duration_seconds, single_line=single_line)
    return AudioArrangement(
        id=arr_id,
        label=label,
        stem=stem,
        fit_score=score,
        fit_reason=reason,
        notes_in=notes_in,
        converted=converted,
        audio_base64=wav_map.get(stem),
    )


def _candidate_specs(
    vocals: tuple[DetectedNote, ...],
    inst: tuple[DetectedNote, ...],
    bass: tuple[DetectedNote, ...],
    mix: tuple[DetectedNote, ...],
) -> list[tuple[str, str, str, tuple[DetectedNote, ...], bool]]:
    if not (vocals or inst or bass):
        return [
            ("full-mix", "Full Mix → Oud Lead", "instruments", extract_monophonic_line(mix), True)
        ]
    specs: list[tuple[str, str, str, tuple[DetectedNote, ...], bool]] = [
        ("vocals-oud", "Vocals → Oud Solo", "vocals", extract_monophonic_line(vocals), True),
        (
            "instruments-lead",
            "Instruments → Lead Melody",
            "instruments",
            extract_monophonic_line(inst, "high"),
            True,
        ),
        ("bass-oud", "Bass → Oud Bassline", "bass", extract_monophonic_line(bass, "low"), True),
    ]
    if vocals and bass:
        specs.append(
            (
                "vocal-bass-duo",
                "Vocals + Bass → Oud Duo",
                "vocals",
                combine_vocal_and_bass(vocals, bass),
                False,
            )
        )
    sparse_chords = extract_sparse_chords(inst, 3)
    if sparse_chords and len(group_chords(sparse_chords)) < len(sparse_chords):
        specs.append(
            ("instruments-chords", "Instruments → Oud Chords", "instruments", sparse_chords, False)
        )
    return specs


def build_audio_arrangements(
    mono: NDArray[np.float32],
    stereo: NDArray[np.float32] | None,
    tuning: Tuning,
    onset_threshold: float,
    frame_threshold: float,
    *,
    stereo_rate: int = SAMPLE_RATE,
) -> tuple[list[AudioArrangement], int]:
    """Separate stems, transcribe each with Basic Pitch, score, and rank Oud arrangements."""
    stems = separate_mix(mono, stereo, stereo_rate=stereo_rate)
    vocals = _detect_wave(stems.vocals, onset_threshold, frame_threshold)
    inst = _detect_wave(stems.instruments, onset_threshold, frame_threshold)
    bass = _detect_wave(stems.bass, onset_threshold, frame_threshold)
    mix = (
        _detect_wave(mono, onset_threshold, frame_threshold) if not (vocals or inst or bass) else ()
    )

    all_notes: Sequence[DetectedNote] = (*vocals, *inst, *bass, *mix)
    bpm = detect_audio_bpm(all_notes)
    ticks_per_sec = ticks_per_second_for_bpm(bpm)
    duration_s = max(1.0, len(mono) / SAMPLE_RATE)

    specs = _candidate_specs(vocals, inst, bass, mix)
    used_stems = {stem for _, _, stem, notes, _ in specs if notes}
    preview_rate = SEP_SAMPLE_RATE if stems.neural else SAMPLE_RATE
    stem_audio = {
        "vocals": stems.preview_vocals,
        "instruments": stems.preview_instruments,
        "bass": stems.preview_bass,
    }
    preview_map = {s: encode_stem_audio(stem_audio[s], preview_rate) for s in used_stems}

    built = [
        arr
        for arr_id, label, stem, notes, single in specs
        if (
            arr := _arrangement_from_notes(
                arr_id,
                label,
                stem,
                notes,
                tuning,
                ticks_per_sec,
                duration_s,
                preview_map,
                single_line=single,
            )
        )
        is not None
    ]
    built.sort(key=lambda a: (-a.fit_score, -a.notes_in, a.id))
    return built, bpm
