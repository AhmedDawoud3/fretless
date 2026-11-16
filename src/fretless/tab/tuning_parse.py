"""Parse written guitar tuning specs (e.g. 'DGBDGA', 'E A D G B E', 'Standard (EADGBE)')."""

import re

from fretless.guitar import GUITAR_TUNINGS
from fretless.pitch import LETTER_STEPS, LETTERS, STEPS_PER_OCTAVE, Letter, NoteName, name_to_pitch

_STANDARD_LOW_TO_HIGH = GUITAR_TUNINGS["standard"].strings[::-1]
_ALTER_STEPS: dict[str, int] = {"": 0, "#": 2, "♯": 2, "b": -2, "♭": -2}
_NOTE_TOKEN = re.compile(r"([A-Ga-g])([#b♯♭]?)(\d?)")
_PAREN = re.compile(r"\(([^)]+)\)")
_TUNING_LINE = re.compile(r"(?:^|\n)\s*(?:Tuning\s*:|\{tuning\s*:)\s*([^\r\n}]+)", re.IGNORECASE)


def parse_note_token(letter_raw: str, alter_raw: str) -> tuple[Letter, int, int]:
    """Return `(letter, alter_steps, pitch_class)` for a raw note letter + accidental."""
    upper = letter_raw.upper()
    letter = next(le for le in LETTERS if le == upper)
    alter = _ALTER_STEPS[alter_raw]
    pitch_class = (LETTER_STEPS[letter] + alter) % STEPS_PER_OCTAVE
    return letter, alter, pitch_class


def _match_compact(token: str) -> list[tuple[str, str, str]] | None:
    matches = list(_NOTE_TOKEN.finditer(token))
    if len(matches) != len(_STANDARD_LOW_TO_HIGH):
        return None
    joined = "".join(m.group(0) for m in matches)
    return [(m.group(1), m.group(2), m.group(3)) for m in matches] if joined == token else None


def _parse_chunk(chunk: str) -> list[tuple[str, str, str]] | None:
    parts = chunk.strip().split()
    if len(parts) == len(_STANDARD_LOW_TO_HIGH):
        matched = [_NOTE_TOKEN.fullmatch(part) for part in parts]
        if all(m is not None for m in matched):
            return [(m.group(1), m.group(2), m.group(3)) for m in matched if m is not None]
    if len(parts) == 1:
        return _match_compact(parts[0])
    return None


def _closest_pitch(pitch_class: int, target: int) -> int:
    all_octaves = [octave * STEPS_PER_OCTAVE + pitch_class for octave in range(1, 6)]
    within_tension = [p for p in all_octaves if p <= target + 4]
    candidates = within_tension or all_octaves
    return min(candidates, key=lambda p: (abs(p - target), p > target))


def _to_pitch(letter_raw: str, alter_raw: str, octave_raw: str, target: int) -> int:
    letter, alter, pitch_class = parse_note_token(letter_raw, alter_raw)
    if octave_raw:
        return name_to_pitch(NoteName(letter, alter, int(octave_raw)))
    return _closest_pitch(pitch_class, target)


def parse_tuning_spec(spec: str) -> tuple[int, ...] | None:
    """Parse a 6-string low-to-high tuning spec into string-1-first fretless pitches."""
    body = spec.split(":", 1)[1] if ":" in spec else spec
    candidates = [*_PAREN.findall(body), _PAREN.sub("", body)]
    tokens = next(
        (parsed for part in candidates if (parsed := _parse_chunk(part)) is not None), None
    )
    if tokens is None:
        return None
    low_to_high = tuple(
        _to_pitch(letter, alter, octave, target)
        for (letter, alter, octave), target in zip(tokens, _STANDARD_LOW_TO_HIGH, strict=True)
    )
    return tuple(reversed(low_to_high))


def extract_tuning_from_text(text: str) -> tuple[int, ...] | None:
    """Find a `Tuning: ...` or `{tuning: ...}` directive in `text` and parse its pitches."""
    match = _TUNING_LINE.search(text)
    return parse_tuning_spec(match.group(1)) if match else None
