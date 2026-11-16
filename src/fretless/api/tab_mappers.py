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
from fretless.tab.convert_model import Alteration, Converted, PlacedNote, PlacedSystem
from fretless.tab.events import GUITAR_LINES
from fretless.tab.model import TabDocument, TabSystem
from fretless.tab.oud_render import Mode, ascii_name, course_labels, render_converted
from fretless.tab.playback import PlaybackEvent, playback
from fretless.tuning import Tuning


def _note_out(note: PlacedNote) -> PlacedNoteOut:
    return PlacedNoteOut(
        course=note.course, position=note.position, pitch=note.pitch, name=ascii_name(note.pitch)
    )


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


def convert_placed_out(
    notes_in: int, converted: Converted, tuning: Tuning, mode: Mode
) -> ConvertOut:
    return ConvertOut(
        text=render_converted(converted, tuning, mode),
        systems=[_system_out(b, tuning) for b in converted.blocks if isinstance(b, PlacedSystem)],
        alterations=[_alteration_out(a) for a in converted.alterations],
        playback=[_playback_out(e) for e in playback(converted)],
        summary=summary_from_count(notes_in, converted),
    )


def convert_out(
    document: TabDocument, converted: Converted, tuning: Tuning, mode: Mode
) -> ConvertOut:
    return convert_placed_out(_notes_in(document), converted, tuning, mode)
