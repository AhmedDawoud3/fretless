"""Domain model for imported tabs from PDFs, Ultimate Guitar, or Songsterr."""

from dataclasses import dataclass


@dataclass(frozen=True)
class ImportedTrack:
    """One playable pitched track inside a multi-track imported source (e.g. Songsterr)."""

    index: int
    name: str
    instrument: str
    is_vocal: bool = False


@dataclass(frozen=True)
class ImportedTab:
    """Normalized 6-line ASCII tab plus optional tuning, capo, tempo, and track metadata."""

    title: str
    source: str
    kind: str  # "tab", "chords", or "sheet"
    text: str
    strings: tuple[int, ...] | None = None
    capo: int = 0
    tempo: int | None = None
    track_index: int | None = None
    tracks: tuple[ImportedTrack, ...] = ()
