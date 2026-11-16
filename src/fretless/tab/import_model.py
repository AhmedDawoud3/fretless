"""Domain model for imported tabs from PDFs, Ultimate Guitar, or Songsterr."""

from dataclasses import dataclass


@dataclass(frozen=True)
class ImportedTab:
    """Normalized 6-line ASCII tab plus optional tuning/capo metadata from an external source."""

    title: str
    source: str
    kind: str  # "tab" or "chords"
    text: str
    strings: tuple[int, ...] | None = None
    capo: int = 0
    tempo: int | None = None
