"""Pure functions turning a conversion into the response schema."""

from fretless.api.tab_schemas import (
    AlterationOut,
    ConvertOut,
    PlacedColumnOut,
    PlacedNoteOut,
    PlacedSystemOut,
    PlaybackEventOut,
    PlaybackNoteOut,
    SummaryOut,
)
from fretless.guitar import fretted_pitch
from fretless.tab.convert_model import Alteration, Converted, PlacedNote, PlacedSystem
from fretless.tab.events import GUITAR_LINES
from fretless.tab.model import TabDocument, TabSystem
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


def summary_out(document: TabDocument, converted: Converted) -> SummaryOut:
    return summary_from_count(_notes_in(document), converted)


def _guitar_note_out(strings: tuple[int, ...], capo: int, line: int, fret: int) -> PlacedNoteOut:
    pitch = fretted_pitch(strings[line - 1], capo, fret)
    return PlacedNoteOut(course=line, position=fret, pitch=pitch, name=ascii_name(pitch))


def _guitar_system_out(
    number: int, system: TabSystem, strings: tuple[int, ...], capo: int
) -> PlacedSystemOut:
    return PlacedSystemOut(
        index=number,
        width=system.width,
        bars=list(system.bars),
        labels=[ascii_name(fretted_pitch(s, capo, 0)) for s in strings],
        columns=[
            PlacedColumnOut(
                index=c.index,
                notes=[_guitar_note_out(strings, capo, n.line, n.fret) for n in c.notes],
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


def convert_placed_out(
    notes_in: int,
    converted: Converted,
    tuning: Tuning,
    mode: Mode,
    guitar_systems: list[PlacedSystemOut] | None = None,
) -> ConvertOut:
    g_systems = guitar_systems or []
    return ConvertOut(
        text=render_converted(converted, tuning, mode),
        systems=[_system_out(b, tuning) for b in converted.blocks if isinstance(b, PlacedSystem)],
        alterations=[_alteration_out(a) for a in converted.alterations],
        playback=[_playback_out(e) for e in playback(converted)],
        summary=summary_from_count(notes_in, converted),
        guitar_systems=g_systems,
        guitar_playback=_guitar_playback_out(g_systems),
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
