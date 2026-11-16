"""Convert a parsed guitar tab to oud placements: fit the range, place, finger, report."""

from dataclasses import dataclass

from fretless.guitar import fretted_pitch
from fretless.pitch import STEPS_PER_OCTAVE
from fretless.tab import alterations as note
from fretless.tab.convert_model import (
    Alteration,
    Converted,
    ConvertedBlock,
    PlacedColumn,
    PlacedNote,
    PlacedSystem,
)
from fretless.tab.events import GUITAR_LINES, Event, extract_events
from fretless.tab.model import TabDocument, TabNote, TabSystem, TextBlock
from fretless.tab.options import Option, options
from fretless.tab.path import best_path
from fretless.tab.render import render_system, to_render_system
from fretless.tab.transpose import Range, best_shift, fold, oud_range
from fretless.tuning import Tuning


@dataclass(frozen=True)
class PlacedEvent:
    notes: tuple[PlacedNote, ...]
    alterations: tuple[Alteration, ...]


@dataclass(frozen=True)
class _Fitted:
    event: Event
    folded: tuple[int, ...]  # the event's pitches after the whole-piece shift and folding
    alterations: list[Alteration]  # octave shifts of single notes


def _fit(events: tuple[Event, ...], span: Range) -> tuple[int, list[_Fitted]]:
    shift = best_shift(tuple(p for e in events for p in e.pitches), span)
    fitted = []
    for event in events:
        shifted = tuple(p + shift for p in event.pitches)
        folded = tuple(fold(p, span) for p in shifted)
        fitted.append(_Fitted(event, folded, note.fitted(event, shifted, folded)))
    return shift, fitted


def _place(fitted: list[_Fitted], tuning: Tuning, span: Range) -> list[Option]:
    return list(best_path([options(tuning, span, tuple(sorted(set(f.folded)))) for f in fitted]))


def place_events(
    events: tuple[Event, ...], tuning: Tuning
) -> tuple[int, dict[tuple[int, int], PlacedEvent]]:
    """Shift, fold, reduce, and finger `events` for `tuning`, keyed by `(system, column)`."""
    span = oud_range(tuning)
    shift, fitted = _fit(events, span)
    done = {
        (f.event.system, f.event.column): PlacedEvent(
            option.notes,
            tuple(f.alterations + note.placed_chord(f.event, f.folded, option.notes)),
        )
        for f, option in zip(fitted, _place(fitted, tuning, span), strict=True)
    }
    return shift, done


def _map_column_techniques(
    src_notes: tuple[TabNote, ...],
    col_index: int,
    placed_notes: tuple[PlacedNote, ...],
    tech_lookup: dict[tuple[int, int], str],
    strings: tuple[int, ...],
    capo: int,
) -> list[tuple[int, int, str]]:
    mapped: list[tuple[int, int, str]] = []
    used_courses: set[int] = set()
    for src in src_notes:
        sym = tech_lookup.get((src.line, col_index))
        if sym is None or not placed_notes:
            continue
        target_pc = fretted_pitch(strings[src.line - 1], capo, src.fret) % STEPS_PER_OCTAVE
        match = next(
            (
                pn.course
                for pn in placed_notes
                if pn.course not in used_courses and pn.pitch % STEPS_PER_OCTAVE == target_pc
            ),
            placed_notes[0].course,
        )
        used_courses.add(match)
        mapped.append((match, col_index, sym))
    return mapped


def _system(
    system: TabSystem,
    number: int,
    done: dict[tuple[int, int], PlacedEvent],
    strings: tuple[int, ...],
    capo: int,
) -> tuple[PlacedSystem, list[Alteration]]:
    columns, altered, mapped_tech = [], [], []
    tech_lookup = {(line, col): sym for line, col, sym in system.techniques}
    for column in system.columns:
        placed = done[(number, column.index)]
        columns.append(PlacedColumn(column.index, placed.notes))
        altered.extend(placed.alterations)
        mapped_tech.extend(
            _map_column_techniques(
                column.notes, column.index, placed.notes, tech_lookup, strings, capo
            )
        )
    return PlacedSystem(
        number, system.width, system.bars, tuple(columns), tuple(mapped_tech)
    ), altered


def convert(
    document: TabDocument, strings: tuple[int, ...], capo: int, tuning: Tuning
) -> Converted:
    """Oud placements for every 6-line system; other blocks pass through as text."""
    shift, done = place_events(extract_events(document, strings, capo), tuning)
    blocks: list[ConvertedBlock] = []
    altered = [note.transposed(shift)] if shift else []
    number = 0
    for block in document.blocks:
        if isinstance(block, TextBlock):
            blocks.append(block)
            continue
        if block.lines == GUITAR_LINES:
            placed, more = _system(block, number, done, strings, capo)
            blocks.append(placed)
            altered += more
        else:
            blocks.append(TextBlock(render_system(to_render_system(block))))
            altered.append(note.unsupported_system(number, block.lines))
        number += 1
    return Converted(tuple(blocks), tuple(altered), shift)
