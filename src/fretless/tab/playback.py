"""The converted events in document order, with a running tick for playing at one tempo."""

from dataclasses import dataclass

from fretless.tab.convert_model import Converted, PlacedNote, PlacedSystem

GAP_TICKS = 8  # characters of silence between one system and the next


@dataclass(frozen=True)
class PlaybackEvent:
    system: int
    column: int
    tick: int  # character offset counted across all systems, so spacing is kept
    notes: tuple[PlacedNote, ...]


def playback(converted: Converted) -> tuple[PlaybackEvent, ...]:
    events: list[PlaybackEvent] = []
    offset = 0
    for block in converted.blocks:
        if isinstance(block, PlacedSystem):
            events += [
                PlaybackEvent(block.index, c.index, offset + c.index, c.notes)
                for c in block.columns
            ]
            offset += block.width + GAP_TICKS
    return tuple(events)
