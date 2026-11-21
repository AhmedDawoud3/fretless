"""Pure functions turning a conversion into the response schema."""

from typing import TypedDict

from fretless.api.tab_schemas import (
    AlterationOut,
    AudioArrangementOut,
    ConvertOut,
    DetectedMaqamOut,
    PlacedColumnOut,
    PlacedNoteOut,
    PlacedSystemOut,
    PlaybackEventOut,
    PlaybackNoteOut,
    SummaryOut,
)
from fretless.audio.arrange import AudioArrangement
from fretless.maqam_detect import detect_maqam_from_pitches
from fretless.tab.convert_model import Alteration, Converted, PlacedNote, PlacedSystem
from fretless.tab.events import GUITAR_LINES, note_pitch
from fretless.tab.model import TabDocument, TabNote, TabSystem
from fretless.tab.oud_render import Mode, ascii_name, course_labels, render_converted
from fretless.tab.playback import GAP_TICKS, PlaybackEvent, playback
from fretless.tuning import Tuning


def _note_out(note: PlacedNote) -> PlacedNoteOut:
    return PlacedNoteOut(
        course=note.course, position=note.position, pitch=note.pitch, name=ascii_name(note.pitch)
    )


def _tech_map(items: tuple[tuple[int, int, str], ...]) -> dict[str, str]:
    return {f"{course}:{col}": sym for course, col, sym in items}


def _system_out(system: PlacedSystem, tuning: Tuning) -> PlacedSystemOut:
    return PlacedSystemOut(
        index=system.index,
        width=system.width,
        bars=list(system.bars),
        labels=list(course_labels(tuning)),
        columns=[
            PlacedColumnOut(index=c.index, notes=[_note_out(n) for n in c.notes])
            for c in system.columns
        ],
        techniques=_tech_map(system.techniques),
    )


def _alteration_out(alteration: Alteration) -> AlterationOut:
    return AlterationOut(
        kind=alteration.kind,
        system=alteration.system,
        column=alteration.column,
        message=alteration.message,
    )


def _playback_out(event: PlaybackEvent) -> PlaybackEventOut:
    return PlaybackEventOut(
        system=event.system,
        column=event.column,
        tick=event.tick,
        notes=[
            PlaybackNoteOut(pitch=n.pitch, course=n.course, position=n.position)
            for n in event.notes
        ],
    )


def _notes_in(document: TabDocument) -> int:
    return sum(
        len(column.notes)
        for block in document.blocks
        if isinstance(block, TabSystem) and block.lines == GUITAR_LINES
        for column in block.columns
    )


def summary_from_count(notes_in: int, converted: Converted) -> SummaryOut:
    count = {
        kind: sum(a.kind == kind for a in converted.alterations)
        for kind in ("octave_shifted", "chord_reduced", "unsupported_system")
    }
    return SummaryOut(
        notes_in=notes_in,
        notes_out=sum(
            len(c.notes) for b in converted.blocks if isinstance(b, PlacedSystem) for c in b.columns
        ),
        transposed_steps=converted.transposed_steps,
        octave_shifted=count["octave_shifted"],
        chords_reduced=count["chord_reduced"],
        unsupported_systems=count["unsupported_system"],
    )


def _guitar_note_out(strings: tuple[int, ...], capo: int, note: TabNote) -> PlacedNoteOut:
    pitch = note_pitch(strings[note.line - 1], capo, note)
    return PlacedNoteOut(course=note.line, position=note.fret, pitch=pitch, name=ascii_name(pitch))


def _guitar_system_out(
    number: int, system: TabSystem, strings: tuple[int, ...], capo: int
) -> PlacedSystemOut:
    return PlacedSystemOut(
        index=number,
        width=system.width,
        bars=list(system.bars),
        labels=[ascii_name(note_pitch(s, capo, TabNote(1, 0))) for s in strings],
        columns=[
            PlacedColumnOut(
                index=c.index,
                notes=[_guitar_note_out(strings, capo, n) for n in c.notes],
            )
            for c in system.columns
        ],
        techniques=_tech_map(system.techniques),
    )


def _guitar_systems_out(
    document: TabDocument, strings: tuple[int, ...], capo: int
) -> list[PlacedSystemOut]:
    systems = [b for b in document.blocks if isinstance(b, TabSystem)]
    return [
        _guitar_system_out(number, system, strings, capo)
        for number, system in enumerate(systems)
        if system.lines == GUITAR_LINES
    ]


def _guitar_playback_out(systems: list[PlacedSystemOut]) -> list[PlaybackEventOut]:
    out: list[PlaybackEventOut] = []
    offset = 0
    for system in systems:
        for col in system.columns:
            out.append(
                PlaybackEventOut(
                    system=system.index,
                    column=col.index,
                    tick=offset + col.index,
                    notes=[
                        PlaybackNoteOut(pitch=n.pitch, course=n.course, position=n.position)
                        for n in col.notes
                    ],
                )
            )
        offset += system.width + GAP_TICKS
    return out


class _CoreFields(TypedDict):
    text: str
    systems: list[PlacedSystemOut]
    alterations: list[AlterationOut]
    playback: list[PlaybackEventOut]
    summary: SummaryOut


def _core_fields(notes_in: int, converted: Converted, tuning: Tuning, mode: Mode) -> _CoreFields:
    return {
        "text": render_converted(converted, tuning, mode),
        "systems": [
            _system_out(b, tuning) for b in converted.blocks if isinstance(b, PlacedSystem)
        ],
        "alterations": [_alteration_out(a) for a in converted.alterations],
        "playback": [_playback_out(e) for e in playback(converted)],
        "summary": summary_from_count(notes_in, converted),
    }


def _detected_maqam_out(converted: Converted) -> list[DetectedMaqamOut]:
    pitches = [
        n.pitch
        for block in converted.blocks
        if isinstance(block, PlacedSystem)
        for col in block.columns
        for n in col.notes
    ]
    return [
        DetectedMaqamOut(
            maqam_id=m.maqam_id,
            maqam_name=m.maqam_name,
            arabic_name=m.arabic_name,
            root=m.root,
            root_name=m.root_name,
            confidence=m.confidence,
            scale_pitches=list(m.scale_pitches),
        )
        for m in detect_maqam_from_pitches(pitches)
    ]


def arrangement_out(item: AudioArrangement, tuning: Tuning, mode: Mode) -> AudioArrangementOut:
    core = _core_fields(item.notes_in, item.converted, tuning, mode)
    return AudioArrangementOut(
        id=item.id,
        label=item.label,
        stem=item.stem,
        fit_score=item.fit_score,
        fit_reason=item.fit_reason,
        notes_count=item.notes_in,
        audio_base64=item.audio_base64,
        detected_maqam=_detected_maqam_out(item.converted),
        **core,
    )


def convert_placed_out(
    notes_in: int,
    converted: Converted,
    tuning: Tuning,
    mode: Mode,
    guitar_systems: list[PlacedSystemOut] | None = None,
    *,
    tempo: int | None = None,
    active_arrangement_id: str | None = None,
    arrangements: list[AudioArrangementOut] | None = None,
) -> ConvertOut:
    g_systems = guitar_systems or []
    core = _core_fields(notes_in, converted, tuning, mode)
    return ConvertOut(
        **core,
        guitar_systems=g_systems,
        guitar_playback=_guitar_playback_out(g_systems),
        tempo=tempo,
        detected_maqam=_detected_maqam_out(converted),
        active_arrangement_id=active_arrangement_id,
        arrangements=arrangements or [],
    )


def convert_out(
    document: TabDocument,
    converted: Converted,
    tuning: Tuning,
    mode: Mode,
    strings: tuple[int, ...] = (),
    capo: int = 0,
) -> ConvertOut:
    g_systems = _guitar_systems_out(document, strings, capo) if strings else []
    return convert_placed_out(_notes_in(document), converted, tuning, mode, g_systems)
