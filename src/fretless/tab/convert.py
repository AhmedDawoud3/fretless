"""Convert a parsed guitar tab to oud placements: fit the range, place, finger, report."""

from collections.abc import Sequence
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
from fretless.tab.model import TabDocument, TabSystem, TextBlock
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
class PlacedInputColumn:
    index: int
    notes: tuple[PlacedNote, ...]


@dataclass(frozen=True)
class PlacedInputSystem:
    index: int
    width: int
    bars: tuple[int, ...]
    columns: tuple[PlacedInputColumn, ...]
    techniques: tuple[tuple[int, int, str], ...] = ()


@dataclass(frozen=True)
class _Fitted:
    event: Event
    folded: tuple[int, ...]  # the event's pitches after the whole-piece shift and folding
    alterations: list[Alteration]  # octave shifts of single notes


def _fit(
    events: tuple[Event, ...], span: Range, transpose_steps: int = 0
) -> tuple[int, list[_Fitted]]:
    shift = (
        transpose_steps
        if transpose_steps != 0
        else best_shift(tuple(p for e in events for p in e.pitches), span)
    )
    fitted = []
    for event in events:
        shifted = tuple(p + shift for p in event.pitches)
        folded = tuple(fold(p, span) for p in shifted)
        fitted.append(_Fitted(event, folded, note.fitted(event, shifted, folded)))
    return shift, fitted


def _place(fitted: list[_Fitted], tuning: Tuning, span: Range) -> list[Option]:
    return list(best_path([options(tuning, span, tuple(sorted(set(f.folded)))) for f in fitted]))


def place_events(
    events: tuple[Event, ...], tuning: Tuning, transpose_steps: int = 0
) -> tuple[int, dict[tuple[int, int], PlacedEvent]]:
    """Shift, fold, reduce, and finger `events` for `tuning`, keyed by `(system, column)`."""
    span = oud_range(tuning)
    shift, fitted = _fit(events, span, transpose_steps)
    done = {
        (f.event.system, f.event.column): PlacedEvent(
            option.notes,
            tuple(f.alterations + note.placed_chord(f.event, f.folded, option.notes)),
        )
        for f, option in zip(fitted, _place(fitted, tuning, span), strict=True)
    }
    return shift, done


def _match_course(
    target_pc: int, placed_notes: tuple[PlacedNote, ...], used_courses: set[int]
) -> int:
    match = next(
        (
            pn.course
            for pn in placed_notes
            if pn.course not in used_courses and pn.pitch % STEPS_PER_OCTAVE == target_pc
        ),
        placed_notes[0].course,
    )
    used_courses.add(match)
    return match


def _map_column_techniques(
    src_targets: list[tuple[int, int]],
    col_index: int,
    placed_notes: tuple[PlacedNote, ...],
    tech_lookup: dict[tuple[int, int], str],
) -> list[tuple[int, int, str]]:
    mapped: list[tuple[int, int, str]] = []
    used_courses: set[int] = set()
    for src_line, target_pc in src_targets:
        sym = tech_lookup.get((src_line, col_index))
        if sym is None or not placed_notes:
            continue
        mapped.append((_match_course(target_pc, placed_notes, used_courses), col_index, sym))
    return mapped


def _system(
    system: TabSystem,
    number: int,
    done: dict[tuple[int, int], PlacedEvent],
    strings: tuple[int, ...],
    capo: int,
    transpose_steps: int = 0,
) -> tuple[PlacedSystem, list[Alteration]]:
    columns, altered, mapped_tech = [], [], []
    tech_lookup = {(line, col): sym for line, col, sym in system.techniques}
    for column in system.columns:
        placed = done[(number, column.index)]
        columns.append(PlacedColumn(column.index, placed.notes))
        altered.extend(placed.alterations)
        targets = [
            (
                n.line,
                (fretted_pitch(strings[n.line - 1], capo, n.fret) + transpose_steps)
                % STEPS_PER_OCTAVE,
            )
            for n in column.notes
        ]
        mapped_tech.extend(_map_column_techniques(targets, column.index, placed.notes, tech_lookup))
    return PlacedSystem(
        number, system.width, system.bars, tuple(columns), tuple(mapped_tech)
    ), altered


def convert(
    document: TabDocument,
    strings: tuple[int, ...],
    capo: int,
    tuning: Tuning,
    transpose_steps: int = 0,
) -> Converted:
    """Oud placements for every 6-line system; other blocks pass through as text."""
    shift, done = place_events(extract_events(document, strings, capo), tuning, transpose_steps)
    blocks: list[ConvertedBlock] = []
    altered = [note.transposed(shift)] if shift else []
    number = 0
    for block in document.blocks:
        if isinstance(block, TextBlock):
            blocks.append(block)
            continue
        if block.lines == GUITAR_LINES:
            placed, more = _system(block, number, done, strings, capo, transpose_steps)
            blocks.append(placed)
            altered += more
        else:
            blocks.append(TextBlock(render_system(to_render_system(block))))
            altered.append(note.unsupported_system(number, block.lines))
        number += 1
    return Converted(tuple(blocks), tuple(altered), shift)


def transpose_placed_systems(
    systems: Sequence[PlacedInputSystem],
    tuning: Tuning,
    transpose_steps: int = 0,
) -> Converted:
    """Re-transpose already placed Oud systems by `transpose_steps` and refit to `tuning`."""
    if not systems:
        return Converted((), (), 0)
    events = tuple(
        Event(sys.index, col.index, tuple(sorted({n.pitch for n in col.notes}, reverse=True)))
        for sys in systems
        for col in sys.columns
        if col.notes
    )
    shift, done = place_events(events, tuning, transpose_steps=transpose_steps)
    blocks: list[ConvertedBlock] = []
    altered = [note.transposed(shift)] if shift else []
    for sys in systems:
        if blocks:
            blocks.append(TextBlock(""))
        tech_lookup = {(course, col): sym for course, col, sym in sys.techniques}
        cols, mapped_tech = [], []
        for col in sys.columns:
            if not col.notes:
                continue
            placed = done[(sys.index, col.index)]
            cols.append(PlacedColumn(col.index, placed.notes))
            altered.extend(placed.alterations)
            targets = [
                (n.course, (n.pitch + transpose_steps) % STEPS_PER_OCTAVE) for n in col.notes
            ]
            mapped_tech.extend(
                _map_column_techniques(targets, col.index, placed.notes, tech_lookup)
            )
        blocks.append(PlacedSystem(sys.index, sys.width, sys.bars, tuple(cols), tuple(mapped_tech)))
    return Converted(tuple(blocks), tuple(altered), shift)
