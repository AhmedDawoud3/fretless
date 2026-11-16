"""Group transcribed notes into chord events and arrange them onto the oud."""

from collections import defaultdict

from fretless.audio.notes import DetectedNote
from fretless.tab import alterations as note
from fretless.tab.convert import PlacedEvent, place_events
from fretless.tab.convert_model import (
    Alteration,
    Converted,
    ConvertedBlock,
    PlacedColumn,
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


def group_chords(notes: tuple[DetectedNote, ...]) -> tuple[tuple[float, tuple[int, ...]], ...]:
    """Cluster sorted notes starting within `CHORD_WINDOW_SECONDS` into descending pitch sets."""
    if not notes:
        return ()
    clusters: list[tuple[float, list[int]]] = []
    for item in notes:
        if not clusters or item.start_seconds - clusters[-1][0] > CHORD_WINDOW_SECONDS:
            clusters.append((item.start_seconds, [item.pitch]))
        else:
            clusters[-1][1].append(item.pitch)
    return tuple((start, tuple(sorted(set(pitches), reverse=True))) for start, pitches in clusters)


def _assign_events(clusters: tuple[tuple[float, tuple[int, ...]], ...]) -> tuple[Event, ...]:
    events: list[Event] = []
    system, base_tick, prev_col = 0, 0, -MIN_COLUMN_GAP
    for start, pitches in clusters:
        tick = round(start * TICKS_PER_SECOND)
        col = max(prev_col + MIN_COLUMN_GAP, tick - base_tick)
        if col >= SYSTEM_WIDTH - 2:
            system += 1
            base_tick = tick
            col = 0
        prev_col = col
        events.append(Event(system, col, pitches))
    return tuple(events)


def _system_block(
    sys_idx: int, sys_events: list[Event], placed: dict[tuple[int, int], PlacedEvent]
) -> tuple[PlacedSystem, list[Alteration]]:
    columns = []
    altered: list[Alteration] = []
    for event in sys_events:
        outcome = placed[(event.system, event.column)]
        columns.append(PlacedColumn(event.column, outcome.notes))
        altered.extend(outcome.alterations)
    return PlacedSystem(sys_idx, SYSTEM_WIDTH, SYSTEM_BARS, tuple(columns)), altered


def _build_blocks(
    events: tuple[Event, ...], placed: dict[tuple[int, int], PlacedEvent], shift: int
) -> tuple[tuple[ConvertedBlock, ...], tuple[Alteration, ...]]:
    by_system: dict[int, list[Event]] = defaultdict(list)
    for event in events:
        by_system[event.system].append(event)
    blocks: list[ConvertedBlock] = []
    altered: list[Alteration] = [note.transposed(shift)] if shift else []
    for sys_idx, sys_events in sorted(by_system.items()):
        if blocks:
            blocks.append(TextBlock(""))
        system_block, more = _system_block(sys_idx, sys_events, placed)
        blocks.append(system_block)
        altered.extend(more)
    return tuple(blocks), tuple(altered)


def arrange_notes(notes: tuple[DetectedNote, ...], tuning: Tuning) -> tuple[int, Converted]:
    """Place transcribed 24-TET notes onto `tuning` via the tab Viterbi pathfinder."""
    if not notes:
        return 0, Converted((), (), 0)
    events = _assign_events(group_chords(notes))
    shift, placed = place_events(events, tuning)
    blocks, altered = _build_blocks(events, placed, shift)
    return len(notes), Converted(blocks, altered, shift)
