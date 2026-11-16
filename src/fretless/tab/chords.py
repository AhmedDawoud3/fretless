"""Parse chord symbols, strip UG/ChordPro markup, and expand chord sheets to 6-line tab."""

import re
from itertools import product

from fretless.chord import QUALITIES, Chord, chord_pitch_classes, essential_roles
from fretless.guitar import GUITAR_TUNINGS, fretted_pitch
from fretless.pitch import STEPS_PER_OCTAVE
from fretless.tab.model import TabSystem
from fretless.tab.oud_render import ascii_name
from fretless.tab.parse import parse_tab
from fretless.tab.render import render_system
from fretless.tab.render_model import RenderCell, RenderSystem
from fretless.tab.tuning_parse import parse_note_token

STANDARD_STRINGS: tuple[int, ...] = GUITAR_TUNINGS["standard"].strings
_CHORD_RE = re.compile(r"^([A-G])([#b♯♭]?)(.*)$")
_BASS_RE = re.compile(r"^([A-G])([#b♯♭]?)$")
_QUALITY_MAP: dict[str, str] = {
    "": "maj",
    "maj": "maj",
    "M": "maj",
    "m": "min",
    "min": "min",
    "-": "min",
    "7": "7",
    "dom7": "7",
    "maj7": "maj7",
    "M7": "maj7",
    "Δ": "maj7",
    "Δ7": "maj7",
    "m7": "m7",
    "min7": "m7",
    "-7": "m7",
    "m9": "m7",
    "dim": "dim",
    "o": "dim",
    "°": "dim",
    "dim7": "dim7",
    "o7": "dim7",
    "°7": "dim7",
    "aug": "aug",
    "+": "aug",
    "sus2": "sus2",
    "sus4": "sus4",
    "sus": "sus4",
    "7sus4": "7",
    "5": "5",
    "6": "6",
    "maj6": "6",
    "m6": "m6",
    "min6": "m6",
    "m7b5": "m7b5",
    "ø": "m7b5",
    "ø7": "m7b5",
    "add9": "add9",
    "add2": "add9",
    "madd9": "min",
    "9": "9",
}

_TAB_TAG_RE = re.compile(r"\[/?tab\]", re.IGNORECASE)
_CH_TAG_RE = re.compile(r"\[ch\](.*?)\[/ch\]", re.IGNORECASE)
_CP_SECTION_RE = re.compile(r"\{(?:section|c|comment)\s*:\s*([^}]+)\}", re.IGNORECASE)
_CP_META_RE = re.compile(
    r"^\s*\{(?:title|t|subtitle|st|artist|a|tuning|capo|tempo|time|key)\s*:[^}]*\}\s*$",
    re.IGNORECASE | re.MULTILINE,
)
_BRACKET_RE = re.compile(r"\[([^\]]+)\]")
_REPEAT_RE = re.compile(r"(?:^|\s)\(?[x\u00d7](\d)\)?\s*$", re.IGNORECASE)
_NOISE_TOKENS = frozenset({"|", "||", "/", "%", "N.C.", "NC"})


def _parse_chord_with_bass(token: str) -> tuple[Chord, int | None] | None:
    cleaned = _CH_TAG_RE.sub(r"\1", token).strip().strip("[]()|,;:")
    if not cleaned:
        return None
    bass_pc: int | None = None
    if "/" in cleaned:
        body, bass = cleaned.split("/", 1)
        bass_match = _BASS_RE.fullmatch(bass)
        if bass_match is None:
            return None
        _, _, bass_pc = parse_note_token(bass_match.group(1), bass_match.group(2))
        cleaned = body
    match = _CHORD_RE.fullmatch(cleaned)
    if match is None:
        return None
    letter_raw, alter_raw, suffix = match.groups()
    quality_id = _QUALITY_MAP.get(suffix)
    if quality_id is None:
        return None
    _, _, pitch_class = parse_note_token(letter_raw, alter_raw)
    return Chord(pitch_class, QUALITIES[quality_id]), bass_pc


def parse_chord_symbol(token: str) -> Chord | None:
    """Parse a guitar chord symbol like 'Am', 'F#m7/C#', or '[ch]E7[/ch]' into a Chord."""
    parsed = _parse_chord_with_bass(token)
    return parsed[0] if parsed is not None else None


def _role_map(chord: Chord) -> dict[int, str]:
    return {
        pc: tone.role
        for pc, tone in zip(chord_pitch_classes(chord), chord.quality.tones, strict=True)
    }


def _finger_count(stopped: list[int]) -> int:
    if not stopped:
        return 0
    anchor = min(stopped)
    extra = sum(1 for fret in stopped if fret > anchor)
    return 1 + extra


def _is_valid_guitar_shape(
    frets: tuple[int | None, ...],
    chord: Chord,
    strings: tuple[int, ...],
    capo: int,
    *,
    min_notes: int,
) -> bool:
    sounding = [(s, f) for s, f in enumerate(frets) if f is not None]
    if len(sounding) < min_notes:
        return False
    stopped = [f for _, f in sounding if f > 0]
    if stopped and max(stopped) - min(stopped) > 3:
        return False
    if _finger_count(stopped) > 4:
        return False
    roles = _role_map(chord)
    heard = {
        role
        for s, f in sounding
        if (role := roles.get(fretted_pitch(strings[s], capo, f) % STEPS_PER_OCTAVE)) is not None
    }
    needed = essential_roles(chord.quality)
    required = needed if len(sounding) >= 3 else needed - {"seventh"}
    return required <= heard


def _shape_score(
    frets: tuple[int | None, ...],
    chord: Chord,
    strings: tuple[int, ...],
    capo: int,
    bass_pc: int | None = None,
) -> tuple[int, int, int, tuple[int, ...]]:
    sounding = [(s, f) for s, f in enumerate(frets) if f is not None]
    bass_idx, bass_fret = max(sounding, key=lambda item: item[0])
    bass_played = fretted_pitch(strings[bass_idx], capo, bass_fret) % STEPS_PER_OCTAVE
    target_bass = chord.root if bass_pc is None else bass_pc
    open_count = sum(1 for _, f in sounding if f == 0)
    stopped = [f for _, f in sounding if f > 0]
    span = (max(stopped) - min(stopped)) if stopped else 0
    max_fret = max(stopped) if stopped else 0
    distinct_pcs = len({fretted_pitch(strings[s], capo, f) % STEPS_PER_OCTAVE for s, f in sounding})
    cost = (
        (0 if bass_played == target_bass else 1000)
        + 12 * max_fret
        - 18 * open_count
        - 20 * len(sounding)
        - 25 * distinct_pcs
        + 6 * _finger_count(stopped)
        + 2 * span
    )
    key_frets = tuple(99 if f is None else f for f in frets)
    return (cost, max_fret, -open_count, key_frets)


def _string_options(
    open_pitch: int, capo: int, classes: frozenset[int], window_start: int
) -> tuple[int, ...]:
    candidates = [0, *range(window_start, window_start + 4)]
    seen: list[int] = []
    for fret in candidates:
        if fret not in seen and fretted_pitch(open_pitch, capo, fret) % STEPS_PER_OCTAVE in classes:
            seen.append(fret)
    return tuple(seen)


def _search_shapes(
    chord: Chord,
    strings: tuple[int, ...],
    capo: int,
    *,
    min_notes: int,
    bass_pc: int | None = None,
) -> list[tuple[int | None, ...]]:
    chord_pcs = set(chord_pitch_classes(chord))
    if bass_pc is not None:
        chord_pcs.add(bass_pc)
    classes = frozenset(chord_pcs)
    valid: list[tuple[int | None, ...]] = []
    for bass_strings in (6, 5, 4, 3):
        if bass_strings < min_notes or bass_strings > len(strings):
            continue
        muted_tail = (None,) * (len(strings) - bass_strings)
        for window_start in range(1, 9):
            opts = [
                _string_options(strings[i], capo, classes, window_start)
                for i in range(bass_strings)
            ]
            if any(not o for o in opts):
                continue
            for combo in product(*opts):
                shape = (*combo, *muted_tail)
                if _is_valid_guitar_shape(shape, chord, strings, capo, min_notes=min_notes):
                    valid.append(shape)
    return valid


def guitar_chord_frets(
    chord: Chord,
    strings: tuple[int, ...] = STANDARD_STRINGS,
    capo: int = 0,
    bass_pc: int | None = None,
) -> tuple[int | None, ...]:
    """Return a playable 6-string guitar voicing `(str1..str6)` with None for muted strings."""
    for min_notes in (4, 3, 2):
        candidates = _search_shapes(chord, strings, capo, min_notes=min_notes, bass_pc=bass_pc)
        if candidates:
            return min(
                candidates, key=lambda shape: _shape_score(shape, chord, strings, capo, bass_pc)
            )
    classes = frozenset(chord_pitch_classes(chord))
    return tuple(
        next(
            (f for f in range(13) if fretted_pitch(open_p, capo, f) % STEPS_PER_OCTAVE in classes),
            None,
        )
        for open_p in strings
    )


def clean_ug_markup(text: str) -> str:
    """Remove `[tab]`/`[ch]` tags and normalize ChordPro metadata lines."""
    cleaned = _TAB_TAG_RE.sub("", text)
    cleaned = _CH_TAG_RE.sub(r"\1", cleaned)
    cleaned = _CP_SECTION_RE.sub(r"[\1]", cleaned)
    return _CP_META_RE.sub("", cleaned)


def _is_repeat_or_noise(token: str) -> bool:
    if token in _NOISE_TOKENS:
        return True
    stripped = token.strip("()|,;")
    if not stripped:
        return True
    return bool(re.fullmatch(r"[x\u00d7]?\d+[.]?", stripped, re.IGNORECASE))


def _standalone_chords(line: str) -> list[tuple[str, Chord, int | None]]:
    repeat_match = _REPEAT_RE.search(line)
    repeats = min(8, int(repeat_match.group(1))) if repeat_match else 1
    body = _REPEAT_RE.sub("", line)
    tokens = [tok for tok in body.replace("|", " | ").split() if not _is_repeat_or_noise(tok)]
    if not tokens:
        return []
    parsed: list[tuple[str, Chord, int | None]] = []
    for tok in tokens:
        entry = _parse_chord_with_bass(tok)
        if entry is None:
            return []
        chord, bass_pc = entry
        parsed.append((tok.strip("[](),;"), chord, bass_pc))
    return [] if len(parsed) == 1 and parsed[0][0] == "A" else parsed * repeats


def _line_chords(line: str) -> list[tuple[str, Chord, int | None]]:
    brackets = _BRACKET_RE.findall(line)
    parsed_brackets = [
        (raw, entry[0], entry[1])
        for raw in brackets
        if (entry := _parse_chord_with_bass(raw)) is not None
    ]
    return parsed_brackets or _standalone_chords(line)


def _looks_like_section(line: str) -> bool:
    stripped = line.strip()
    return bool(
        (
            stripped.startswith("[")
            and stripped.endswith("]")
            and parse_chord_symbol(stripped) is None
        )
        or (stripped.endswith(":") and len(stripped) <= 32)
    )


def _render_chord_chunk(
    chunk: list[tuple[str, Chord, int | None]], strings: tuple[int, ...], capo: int
) -> str:
    step = 4
    labels = tuple(ascii_name(s) for s in strings)
    cells: list[RenderCell] = []
    for idx, (_name, chord, bass_pc) in enumerate(chunk):
        col = idx * step + 1
        for line_no, fret in enumerate(guitar_chord_frets(chord, strings, capo, bass_pc), start=1):
            if fret is not None:
                cells.append(RenderCell(line_no, col, str(fret)))
    width = len(chunk) * step + 1
    bars = tuple(range(4 * step + 1, width - 1, 4 * step))
    header = "  ".join(name for name, _, _ in chunk)
    body = render_system(RenderSystem(labels, width, bars, tuple(cells)))
    return f"{header}\n{body}"


def has_six_line_tab(text: str) -> bool:
    """True when `text` already contains at least one 6-line guitar tab system."""
    return any(isinstance(b, TabSystem) and b.lines == 6 for b in parse_tab(text).blocks)


def _render_pending_chunks(
    pending: list[tuple[str, Chord, int | None]],
    strings: tuple[int, ...],
    capo: int,
) -> list[str]:
    return [
        _render_chord_chunk(pending[start : start + 8], strings, capo)
        for start in range(0, len(pending), 8)
    ]


def expand_chord_sheet(
    text: str,
    strings: tuple[int, ...] = STANDARD_STRINGS,
    capo: int = 0,
) -> str:
    """If `text` has no 6-line tab systems, convert chord progressions into playable 6-line tab."""
    cleaned = clean_ug_markup(text)
    if has_six_line_tab(cleaned):
        return cleaned
    blocks: list[str] = []
    pending: list[tuple[str, Chord, int | None]] = []
    for line in cleaned.splitlines():
        found = _line_chords(line)
        if found:
            pending.extend(found)
        elif _looks_like_section(line):
            blocks.extend(_render_pending_chunks(pending, strings, capo))
            pending.clear()
            blocks.append(line.strip())
    blocks.extend(_render_pending_chunks(pending, strings, capo))
    return "\n\n".join(blocks) if blocks else cleaned
