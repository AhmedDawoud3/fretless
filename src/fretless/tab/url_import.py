"""Import tabs and chord sheets from Ultimate Guitar and Songsterr URLs."""

import gzip
import html
import json
import re
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Callable
from typing import Any

from fretless.guitar import GUITAR_TUNINGS
from fretless.tab.chords import clean_ug_markup, expand_chord_sheet, has_six_line_tab
from fretless.tab.import_model import ImportedTab
from fretless.tab.oud_render import ascii_name
from fretless.tab.render import render_system
from fretless.tab.render_model import RenderCell, RenderSystem
from fretless.tab.tuning_parse import (
    extract_tempo_from_text,
    extract_tuning_from_text,
    parse_tuning_spec,
)

Fetcher = Callable[[str], bytes]
_STANDARD_STRINGS = GUITAR_TUNINGS["standard"].strings
_TIMEOUT_SECONDS = 12.0
_HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
_UG_STORE_RE = re.compile(r"""class=["']js-store["'][^>]*\bdata-content=(["'])(.*?)\1""", re.DOTALL)
_SONGSTERR_ID_RE = re.compile(r"(?:-s|/api/(?:meta|chords)/)(\d+)(?:t(\d+))?(?:\b|$)")
_MAX_TITLE_PARTS = 2


def default_fetch(url: str) -> bytes:
    """Fetch a public URL with a browser User-Agent; raises ValueError on network or HTTP errors."""
    req = urllib.request.Request(url, headers=_HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=_TIMEOUT_SECONDS) as resp:
            return resp.read()
    except urllib.error.HTTPError as err:
        raise ValueError(
            f"Remote server returned HTTP {err.code}. If blocked, paste the tab or export PDF."
        ) from err
    except (urllib.error.URLError, TimeoutError, OSError) as err:
        raise ValueError(f"Could not reach remote host: {err}") from err


def _maybe_gunzip(raw: bytes) -> bytes:
    return gzip.decompress(raw) if raw.startswith(b"\x1f\x8b") else raw


def _fetch_json(url: str, fetcher: Fetcher) -> dict[str, Any]:
    raw = _maybe_gunzip(fetcher(url))
    try:
        parsed = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as err:
        raise ValueError("Remote server returned invalid JSON.") from err
    if not isinstance(parsed, dict):
        raise ValueError("Unexpected JSON payload from remote server.")
    return parsed


def _as_dict(value: object) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _clamp_capo(raw: object) -> int:
    if isinstance(raw, int) and not isinstance(raw, bool):
        return max(0, min(12, raw))
    return 0


def _join_title(*parts: str, fallback: str) -> str:
    clean = [p.strip() for p in parts if p and p.strip()]
    return " — ".join(clean[:_MAX_TITLE_PARTS]) if clean else fallback


def _ug_store_data(html_text: str) -> dict[str, Any]:
    match = _UG_STORE_RE.search(html_text)
    if match is None:
        raise ValueError(
            "Could not find tab data on that Ultimate Guitar page. Paste the tab text instead."
        )
    try:
        store = json.loads(html.unescape(match.group(2)))
    except json.JSONDecodeError as err:
        raise ValueError("Could not decode Ultimate Guitar tab metadata.") from err
    data = store.get("store", {}).get("page", {}).get("data", {})
    if not isinstance(data, dict) or "tab_view" not in data:
        raise ValueError("Ultimate Guitar page did not contain tab content.")
    return data


def _ug_metadata(
    data: dict[str, Any], strings_override: tuple[int, ...] | None
) -> tuple[str, str, tuple[int, ...] | None, int]:
    tab_info = _as_dict(data.get("tab"))
    tab_view = _as_dict(data.get("tab_view"))
    wiki_tab = _as_dict(tab_view.get("wiki_tab"))
    raw_content = wiki_tab.get("content", "")
    if not isinstance(raw_content, str) or not raw_content.strip():
        raise ValueError("Ultimate Guitar tab content is empty.")
    meta = _as_dict(tab_view.get("meta"))
    capo = _clamp_capo(meta.get("capo"))
    tuning_info = _as_dict(meta.get("tuning"))
    tuning_val = tuning_info.get("value")
    strings = strings_override or (
        parse_tuning_spec(tuning_val) if isinstance(tuning_val, str) and tuning_val else None
    )
    title = _join_title(
        str(tab_info.get("artist_name", "")),
        str(tab_info.get("song_name", "")),
        fallback="Ultimate Guitar Tab",
    )
    return raw_content, title, strings, capo


def parse_ug_html(
    html_text: str,
    preferred_kind: str = "auto",
    strings_override: tuple[int, ...] | None = None,
) -> ImportedTab:
    """Parse an Ultimate Guitar tab or chords HTML document into an `ImportedTab`."""
    raw_content, title, strings, capo = _ug_metadata(_ug_store_data(html_text), strings_override)
    tempo = extract_tempo_from_text(raw_content)
    cleaned = clean_ug_markup(raw_content).strip()
    is_tab_type = has_six_line_tab(cleaned)
    if preferred_kind != "chords" and is_tab_type:
        return ImportedTab(
            title=title,
            source="ultimate-guitar",
            kind="tab",
            text=cleaned,
            strings=strings,
            capo=capo,
            tempo=tempo,
        )
    expanded = expand_chord_sheet(raw_content, strings or _STANDARD_STRINGS, capo)
    if has_six_line_tab(expanded):
        return ImportedTab(
            title=title,
            source="ultimate-guitar",
            kind="chords",
            text=expanded,
            strings=strings,
            capo=capo,
            tempo=tempo,
        )
    if preferred_kind == "auto" and is_tab_type:
        return ImportedTab(
            title=title,
            source="ultimate-guitar",
            kind="tab",
            text=cleaned,
            strings=strings,
            capo=capo,
            tempo=tempo,
        )
    raise ValueError("No playable 6-line guitar tab or chords found on that Ultimate Guitar page.")


def _midi_tuning_to_strings(raw: object) -> tuple[int, ...] | None:
    if not isinstance(raw, list) or len(raw) != 6:
        return None
    if not all(isinstance(n, int) and 24 <= 2 * (n - 12) <= 144 for n in raw):
        return None
    return tuple(2 * (n - 12) for n in raw)


def _measure_beats(measure: dict[str, Any]) -> list[dict[str, Any]]:
    voices = measure.get("voices")
    if not isinstance(voices, list) or not voices:
        return []
    first = voices[0]
    beats = first.get("beats") if isinstance(first, dict) else []
    return [b for b in beats if isinstance(b, dict)] if isinstance(beats, list) else []


def _has_technique(note: dict[str, Any]) -> bool:
    return bool(
        note.get("hp")
        or note.get("slide")
        or note.get("bend")
        or note.get("vibrato")
        or note.get("leftHandVibrato")
    )


def _direction_symbol(next_fret: int | None, fret: int, up: str, down: str) -> str:
    return down if next_fret is not None and next_fret < fret else up


def _note_symbol(note: dict[str, Any], line_no: int, fret: int, next_frets: dict[int, int]) -> str:
    next_fret = next_frets.get(line_no)
    if note.get("hp"):
        return _direction_symbol(next_fret, fret, "h", "p")
    if note.get("slide"):
        return _direction_symbol(next_fret, fret, "/", "\\")
    if note.get("bend"):
        return "b"
    return "~" if note.get("vibrato") or note.get("leftHandVibrato") else ""


def _valid_fret_pos(string_idx: object, fret: object) -> tuple[int, int] | None:
    if isinstance(string_idx, int) and isinstance(fret, int):
        return (string_idx + 1, fret) if 0 <= string_idx < 6 and 0 <= fret <= 24 else None
    return None


def _parse_beat_note(
    note: object, next_frets: dict[int, int] | None = None
) -> tuple[int, str] | None:
    if not isinstance(note, dict) or note.get("rest"):
        return None
    if note.get("tie") and not _has_technique(note):
        return None
    pos = _valid_fret_pos(note.get("string"), note.get("fret"))
    if pos is None:
        return None
    line_no, fret = pos
    return line_no, f"{fret}{_note_symbol(note, line_no, fret, next_frets or {})}"


def _beat_notes(
    beat: dict[str, Any], next_frets: dict[int, int] | None = None
) -> list[tuple[int, str]]:
    raw_notes = beat.get("notes") if not beat.get("rest") else None
    if not isinstance(raw_notes, list):
        return []
    out: list[tuple[int, str]] = []
    seen_lines: set[int] = set()
    for note in raw_notes:
        parsed = _parse_beat_note(note, next_frets)
        if parsed and parsed[0] not in seen_lines:
            seen_lines.add(parsed[0])
            out.append(parsed)
    return out


def _beat_fret_map(beat: dict[str, Any]) -> dict[int, int]:
    if beat.get("rest") or not isinstance(beat.get("notes"), list):
        return {}
    out: dict[int, int] = {}
    for note in beat["notes"]:
        if (
            isinstance(note, dict)
            and isinstance(note.get("string"), int)
            and isinstance(note.get("fret"), int)
        ):
            out[note["string"] + 1] = note["fret"]
    return out


def _beat_ticks(beat: dict[str, Any]) -> int:
    dur = beat.get("duration")
    if (
        isinstance(dur, list)
        and len(dur) == 2
        and isinstance(dur[0], int)
        and isinstance(dur[1], int)
        and dur[1] > 0
    ):
        return max(2, min(16, round(32.0 * (dur[0] / dur[1]))))
    return 4


def _songsterr_tempo(track: dict[str, Any]) -> int | None:
    auto = _as_dict(track.get("automations"))
    entries = auto.get("tempo")
    if not isinstance(entries, list) or not entries:
        return None
    first = entries[0] if isinstance(entries[0], dict) else {}
    bpm = first.get("bpm") or first.get("tempo")
    if isinstance(bpm, (int, float)) and not isinstance(bpm, bool):
        rounded = round(bpm)
        return rounded if 40 <= rounded <= 240 else None
    return None


def _measure_marker(measure: dict[str, Any]) -> str | None:
    marker = measure.get("marker")
    text = marker.get("text") if isinstance(marker, dict) else None
    return f"[{text.strip()}]" if isinstance(text, str) and text.strip() else None


def _format_chunk(
    headers: list[str], labels: tuple[str, ...], col: int, bars: list[int], cells: list[RenderCell]
) -> str:
    if bars and bars[-1] + 2 >= col:
        bars.pop()
    rendered = render_system(RenderSystem(labels, col + 1, tuple(bars), tuple(cells)))
    return f"{' '.join(headers)}\n{rendered}" if headers else rendered


def _chunk_beats(
    measures: list[dict[str, Any]],
) -> list[tuple[int, dict[str, Any]]]:
    return [(m_idx, beat) for m_idx, m in enumerate(measures) for beat in _measure_beats(m)]


def _advance_measure_bar(
    m_idx: int,
    prev_measure: int,
    col: int,
    bars: list[int],
    cells: list[RenderCell],
) -> tuple[int, int]:
    if m_idx <= prev_measure or not cells:
        return prev_measure, col
    bar_col = max(cells[-1].index + 1, col - 1)
    bars.append(bar_col)
    return m_idx, max(col, bar_col + 1)


def _render_measure_chunk(
    measures: list[dict[str, Any]],
    labels: tuple[str, ...],
) -> str | None:
    cells: list[RenderCell] = []
    bars: list[int] = []
    headers = [h for m in measures if (h := _measure_marker(m)) is not None]
    flat = _chunk_beats(measures)
    col, prev_measure = 1, 0
    for idx, (m_idx, beat) in enumerate(flat):
        prev_measure, col = _advance_measure_bar(m_idx, prev_measure, col, bars, cells)
        next_frets = _beat_fret_map(flat[idx + 1][1]) if idx + 1 < len(flat) else {}
        notes = _beat_notes(beat, next_frets)
        cells.extend(RenderCell(line_no, col, text) for line_no, text in notes)
        if notes or cells:
            col = min(col + _beat_ticks(beat), cells[-1].index + 16)
    return _format_chunk(headers, labels, col, bars, cells) if cells else None


def _group_measures(measures: list[object]) -> list[list[dict[str, Any]]]:
    groups: list[list[dict[str, Any]]] = []
    for measure in measures:
        if not isinstance(measure, dict) or not any(
            _beat_notes(b) for b in _measure_beats(measure)
        ):
            continue
        if not groups or len(groups[-1]) >= 4 or _measure_marker(measure) is not None:
            groups.append([measure])
        else:
            groups[-1].append(measure)
    return groups


def render_songsterr_track(track: dict[str, Any], title: str = "Songsterr Tab") -> ImportedTab:
    """Render a Songsterr CloudFront track JSON dictionary into a 6-line `ImportedTab`."""
    strings = _midi_tuning_to_strings(track.get("tuning"))
    labels = tuple(ascii_name(s) for s in (strings or _STANDARD_STRINGS))
    measures = track.get("measures")
    if not isinstance(measures, list):
        raise ValueError("Songsterr track contained no measures.")
    rendered = [
        b for group in _group_measures(measures) if (b := _render_measure_chunk(group, labels))
    ]
    if not rendered:
        raise ValueError("Selected Songsterr track has no playable notes.")
    return ImportedTab(
        title=title,
        source="songsterr",
        kind="tab",
        text="\n\n".join(rendered),
        strings=strings,
        tempo=_songsterr_tempo(track),
    )


def _is_six_string_track(track: object, *, allow_vocal: bool = False) -> bool:
    if not isinstance(track, dict):
        return False
    if not allow_vocal and (track.get("isVocalTrack") or track.get("isEmpty")):
        return False
    return _midi_tuning_to_strings(track.get("tuning")) is not None


def _first_six_string(tracks: list[object], indices: list[object]) -> int | None:
    for idx in indices:
        if isinstance(idx, int) and 0 <= idx < len(tracks) and _is_six_string_track(tracks[idx]):
            return idx
    return None


def _pick_songsterr_track(meta: dict[str, Any], requested: int | None) -> int:
    tracks = meta.get("tracks")
    if not isinstance(tracks, list) or not tracks:
        raise ValueError("Songsterr song metadata listed no tracks.")
    if requested is not None:
        if 0 <= requested < len(tracks) and _is_six_string_track(
            tracks[requested], allow_vocal=True
        ):
            return requested
        raise ValueError("Requested Songsterr track is not a 6-string guitar track.")
    candidates = [
        *[meta.get(key) for key in ("popularTrackGuitar", "defaultTrack", "popularTrack")],
        *range(len(tracks)),
    ]
    picked = _first_six_string(tracks, candidates)
    if picked is not None:
        return picked
    raise ValueError("No 6-string guitar track found in this Songsterr song.")


def _fetch_songsterr_chords(song_id: str, fetcher: Fetcher) -> ImportedTab:
    chords_meta = _fetch_json(f"https://www.songsterr.com/api/chords/{song_id}", fetcher)
    rev = chords_meta.get("chordsRevisionId") or song_id
    cp_id = chords_meta.get("chordpro")
    if not isinstance(cp_id, str) or not cp_id:
        raise ValueError("Songsterr has no chord sheet for this song.")
    cp_url = f"https://chordpro2.songsterr.com/{song_id}/{rev}/{cp_id}.chordpro"
    chordpro = _maybe_gunzip(fetcher(cp_url)).decode("utf-8", errors="replace")
    strings = extract_tuning_from_text(chordpro)
    title = _join_title(
        str(chords_meta.get("artist", "")),
        str(chords_meta.get("title", "")),
        fallback="Songsterr Chords",
    )
    expanded = expand_chord_sheet(chordpro, strings or _STANDARD_STRINGS, 0)
    if not has_six_line_tab(expanded):
        raise ValueError("No playable chords found in Songsterr chord sheet.")
    return ImportedTab(
        title=title,
        source="songsterr",
        kind="chords",
        text=expanded,
        strings=strings,
        capo=0,
        tempo=extract_tempo_from_text(chordpro),
    )


def _track_chords_fallback(track: dict[str, Any], title: str) -> ImportedTab:
    strings = _midi_tuning_to_strings(track.get("tuning"))
    chords: list[str] = []
    for measure in track.get("measures", []):
        if not isinstance(measure, dict):
            continue
        for beat in _measure_beats(measure):
            chord_obj = beat.get("chord")
            if isinstance(chord_obj, dict) and isinstance(chord_obj.get("text"), str):
                chords.append(chord_obj["text"].strip())
    expanded = expand_chord_sheet(" ".join(chords), strings or _STANDARD_STRINGS, 0)
    if not has_six_line_tab(expanded):
        raise ValueError("No chord annotations found in this Songsterr song.")
    return ImportedTab(
        title=title,
        source="songsterr",
        kind="chords",
        text=expanded,
        strings=strings,
        capo=0,
        tempo=_songsterr_tempo(track),
    )


def _try_songsterr_chords(song_id: str, fetcher: Fetcher) -> ImportedTab | None:
    try:
        return _fetch_songsterr_chords(song_id, fetcher)
    except ValueError:
        return None


def _import_songsterr_meta(
    song_id: str, track_arg: int | None, wants_chords: bool, fetcher: Fetcher
) -> ImportedTab:
    meta = _fetch_json(f"https://www.songsterr.com/api/meta/{song_id}", fetcher)
    title = _join_title(
        str(meta.get("artist", "")), str(meta.get("title", "")), fallback="Songsterr Tab"
    )
    track_idx = _pick_songsterr_track(meta, track_arg)
    sid, rev, image = meta.get("songId", song_id), meta.get("revisionId"), meta.get("image")
    if not rev or not image:
        raise ValueError("Songsterr revision metadata is incomplete.")
    track = _fetch_json(
        f"https://dqsljvtekg760.cloudfront.net/{sid}/{rev}/{image}/{track_idx}.json", fetcher
    )
    return (
        _track_chords_fallback(track, title)
        if wants_chords
        else render_songsterr_track(track, title=title)
    )


def import_songsterr_url(
    url: str,
    preferred_kind: str = "auto",
    fetcher: Fetcher = default_fetch,
) -> ImportedTab:
    """Import a Songsterr tab or chords URL into a 6-line `ImportedTab`."""
    match = _SONGSTERR_ID_RE.search(url)
    if match is None:
        raise ValueError("Could not find a Songsterr song ID in that URL.")
    song_id, raw_track = match.group(1), match.group(2)
    track_arg = int(raw_track) if raw_track is not None else None
    wants_chords = preferred_kind == "chords" or (
        preferred_kind == "auto" and "-chords-" in url.lower()
    )
    if wants_chords and (chords := _try_songsterr_chords(song_id, fetcher)) is not None:
        return chords
    return _import_songsterr_meta(song_id, track_arg, wants_chords, fetcher)


def import_ug_url(
    url: str,
    preferred_kind: str = "auto",
    fetcher: Fetcher = default_fetch,
) -> ImportedTab:
    """Fetch an Ultimate Guitar tab or chords page and parse it into an `ImportedTab`."""
    raw = _maybe_gunzip(fetcher(url)).decode("utf-8", errors="replace")
    return parse_ug_html(raw, preferred_kind=preferred_kind)


def import_tab_url(
    url: str,
    kind: str = "auto",
    fetcher: Fetcher = default_fetch,
) -> ImportedTab:
    """Import an Ultimate Guitar or Songsterr tab/chords URL into a 6-line `ImportedTab`."""
    cleaned = url.strip()
    parsed = urllib.parse.urlsplit(cleaned)
    host = parsed.netloc.lower()
    if parsed.scheme not in ("http", "https") or not host:
        raise ValueError("Enter a valid http(s) Ultimate Guitar or Songsterr URL.")
    if host == "ultimate-guitar.com" or host.endswith(".ultimate-guitar.com"):
        return import_ug_url(cleaned, preferred_kind=kind, fetcher=fetcher)
    if host == "songsterr.com" or host.endswith(".songsterr.com"):
        return import_songsterr_url(cleaned, preferred_kind=kind, fetcher=fetcher)
    raise ValueError("Enter a valid Ultimate Guitar or Songsterr URL.")
