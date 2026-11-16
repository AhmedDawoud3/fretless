"""Import and render Songsterr multi-track tabs (guitar, vocals, bass) and chord sheets."""

import json
import re
from collections.abc import Callable
from typing import Any

from fretless.guitar import GUITAR_TUNINGS
from fretless.tab.chords import expand_chord_sheet, has_six_line_tab
from fretless.tab.import_model import ImportedTab, ImportedTrack
from fretless.tab.oud_render import ascii_name
from fretless.tab.render import render_system
from fretless.tab.render_model import RenderCell, RenderSystem
from fretless.tab.sheet_import import note_candidates
from fretless.tab.tuning_parse import extract_tempo_from_text, extract_tuning_from_text

Fetcher = Callable[[str], bytes]
_STANDARD_STRINGS = GUITAR_TUNINGS["standard"].strings
_SONGSTERR_ID_RE = re.compile(r"(?:-s|/api/(?:meta|chords)/)(\d+)(?:t(\d+))?(?:\b|$)")
_SAFE_SEGMENT_RE = re.compile(r"[A-Za-z0-9_-]+")


def _fetch_json(url: str, fetcher: Fetcher) -> dict[str, Any]:
    raw = fetcher(url)
    try:
        parsed = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as err:
        raise ValueError("Remote server returned invalid JSON.") from err
    if not isinstance(parsed, dict):
        raise ValueError("Unexpected JSON payload from remote server.")
    return parsed


def _parse_midi_tuning(raw: object) -> tuple[int, ...] | None:
    if not isinstance(raw, list) or not (1 <= len(raw) <= 12):
        return None
    valid = all(
        isinstance(n, int) and not isinstance(n, bool) and 24 <= 2 * (n - 12) <= 144 for n in raw
    )
    return tuple(2 * (n - 12) for n in raw) if valid else None


def _midi_tuning_to_strings(raw: object) -> tuple[int, ...] | None:
    parsed = _parse_midi_tuning(raw)
    return parsed if parsed is not None and len(parsed) == 6 else None


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


def _map_string_fret(
    string_idx: object, fret: object, raw_tuning: tuple[int, ...]
) -> tuple[int, int] | None:
    if not (isinstance(string_idx, int) and isinstance(fret, int)):
        return None
    if not (0 <= string_idx < len(raw_tuning) and 0 <= fret <= 24):
        return None
    if len(raw_tuning) == 6:
        return string_idx + 1, fret
    candidates = note_candidates(raw_tuning[string_idx] + 2 * fret, _STANDARD_STRINGS)
    return candidates[0] if candidates else None


def _parse_beat_note(
    note: object,
    next_frets: dict[int, int] | None = None,
    raw_tuning: tuple[int, ...] = _STANDARD_STRINGS,
) -> tuple[int, str] | None:
    if not isinstance(note, dict) or note.get("rest"):
        return None
    if note.get("tie") and not _has_technique(note):
        return None
    pos = _map_string_fret(note.get("string"), note.get("fret"), raw_tuning)
    if pos is None:
        return None
    line_no, fret = pos
    return line_no, f"{fret}{_note_symbol(note, line_no, fret, next_frets or {})}"


def _beat_notes(
    beat: dict[str, Any],
    next_frets: dict[int, int] | None = None,
    raw_tuning: tuple[int, ...] = _STANDARD_STRINGS,
) -> list[tuple[int, str]]:
    raw_notes = beat.get("notes") if not beat.get("rest") else None
    if not isinstance(raw_notes, list):
        return []
    out: list[tuple[int, str]] = []
    seen_lines: set[int] = set()
    for note in raw_notes:
        parsed = _parse_beat_note(note, next_frets, raw_tuning)
        if parsed and parsed[0] not in seen_lines:
            seen_lines.add(parsed[0])
            out.append(parsed)
    return out


def _beat_fret_map(
    beat: dict[str, Any], raw_tuning: tuple[int, ...] = _STANDARD_STRINGS
) -> dict[int, int]:
    if beat.get("rest") or not isinstance(beat.get("notes"), list):
        return {}
    out: dict[int, int] = {}
    for note in beat["notes"]:
        if not isinstance(note, dict):
            continue
        pos = _map_string_fret(note.get("string"), note.get("fret"), raw_tuning)
        if pos is not None:
            out[pos[0]] = pos[1]
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
    auto = track.get("automations")
    entries = auto.get("tempo") if isinstance(auto, dict) else None
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


def _advance_measure_bar(
    m_idx: int, prev_measure: int, col: int, bars: list[int], cells: list[RenderCell]
) -> tuple[int, int]:
    if m_idx <= prev_measure or not cells:
        return prev_measure, col
    bar_col = max(cells[-1].index + 1, col - 1)
    bars.append(bar_col)
    return m_idx, max(col, bar_col + 1)


def _render_measure_chunk(
    measures: list[dict[str, Any]], labels: tuple[str, ...], raw_tuning: tuple[int, ...]
) -> str | None:
    cells: list[RenderCell] = []
    bars: list[int] = []
    headers = [h for m in measures if (h := _measure_marker(m)) is not None]
    flat = [(m_idx, beat) for m_idx, m in enumerate(measures) for beat in _measure_beats(m)]
    col, prev_measure = 1, 0
    for idx, (m_idx, beat) in enumerate(flat):
        prev_measure, col = _advance_measure_bar(m_idx, prev_measure, col, bars, cells)
        next_frets = _beat_fret_map(flat[idx + 1][1], raw_tuning) if idx + 1 < len(flat) else {}
        notes = _beat_notes(beat, next_frets, raw_tuning)
        cells.extend(RenderCell(line_no, col, text) for line_no, text in notes)
        if notes or cells:
            col = min(col + _beat_ticks(beat), cells[-1].index + 16)
    return _format_chunk(headers, labels, col, bars, cells) if cells else None


def _group_measures(
    measures: list[object], raw_tuning: tuple[int, ...]
) -> list[list[dict[str, Any]]]:
    groups: list[list[dict[str, Any]]] = []
    for measure in measures:
        if not isinstance(measure, dict) or not any(
            _beat_notes(b, raw_tuning=raw_tuning) for b in _measure_beats(measure)
        ):
            continue
        if not groups or len(groups[-1]) >= 4 or _measure_marker(measure) is not None:
            groups.append([measure])
        else:
            groups[-1].append(measure)
    return groups


def render_songsterr_track(
    track: dict[str, Any],
    title: str = "Songsterr Tab",
    track_index: int | None = None,
    tracks: tuple[ImportedTrack, ...] = (),
) -> ImportedTab:
    """Render a Songsterr CloudFront track JSON dictionary into a 6-line `ImportedTab`."""
    parsed_tuning = _parse_midi_tuning(track.get("tuning"))
    raw_tuning = parsed_tuning or _STANDARD_STRINGS
    strings = (
        parsed_tuning
        if parsed_tuning is not None and len(parsed_tuning) == 6
        else (_STANDARD_STRINGS if parsed_tuning is not None else None)
    )
    labels = tuple(ascii_name(s) for s in (strings or _STANDARD_STRINGS))
    measures = track.get("measures")
    if not isinstance(measures, list):
        raise ValueError("Songsterr track contained no measures.")
    rendered = [
        b
        for group in _group_measures(measures, raw_tuning)
        if (b := _render_measure_chunk(group, labels, raw_tuning))
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
        track_index=track_index,
        tracks=tracks,
    )


def _is_pitched_track(track: object) -> bool:
    if not isinstance(track, dict) or track.get("isEmpty"):
        return False
    if str(track.get("instrument", "")).strip().lower() == "drums":
        return False
    return _parse_midi_tuning(track.get("tuning")) is not None


def _track_label(track: dict[str, Any], idx: int) -> ImportedTrack:
    inst = str(track.get("instrument") or "").strip()
    name = str(track.get("name") or "").strip() or inst or f"Track {idx + 1}"
    return ImportedTrack(
        index=idx,
        name=name,
        instrument=inst,
        is_vocal=bool(track.get("isVocalTrack")),
    )


def _songsterr_tracks(meta: dict[str, Any]) -> tuple[ImportedTrack, ...]:
    tracks = meta.get("tracks")
    if not isinstance(tracks, list):
        return ()
    return tuple(_track_label(t, idx) for idx, t in enumerate(tracks) if _is_pitched_track(t))


def _find_track(
    tracks: list[object], indices: list[object], pred: Callable[[dict[str, Any]], bool]
) -> int | None:
    for idx in indices:
        if isinstance(idx, int) and 0 <= idx < len(tracks):
            item = tracks[idx]
            if _is_pitched_track(item) and isinstance(item, dict) and pred(item):
                return idx
    return None


def _is_nonvocal_six_string(track: dict[str, Any]) -> bool:
    return _midi_tuning_to_strings(track.get("tuning")) is not None and not track.get(
        "isVocalTrack"
    )


def _is_vocal_track(track: dict[str, Any]) -> bool:
    text = f"{track.get('name', '')} {track.get('instrument', '')}".lower()
    return bool(track.get("isVocalTrack")) or "vocal" in text


def _is_bass_track(track: dict[str, Any]) -> bool:
    return "bass" in f"{track.get('name', '')} {track.get('instrument', '')}".lower()


def _url_hint_track(tracks: list[object], indices: list[object], url: str) -> int | None:
    low = url.lower()
    if "-vocal" in low:
        return _find_track(tracks, indices, _is_vocal_track)
    if "-bass" in low:
        return _find_track(tracks, indices, _is_bass_track)
    return None


def _pick_songsterr_track(meta: dict[str, Any], requested: int | None, url: str = "") -> int:
    tracks = meta.get("tracks")
    if not isinstance(tracks, list) or not tracks:
        raise ValueError("Songsterr song metadata listed no tracks.")
    if requested is not None:
        if 0 <= requested < len(tracks) and _is_pitched_track(tracks[requested]):
            return requested
        raise ValueError("Requested Songsterr track is not a playable pitched track.")
    all_indices: list[object] = list(range(len(tracks)))
    if (hinted := _url_hint_track(tracks, all_indices, url)) is not None:
        return hinted
    candidates = [
        *[meta.get(key) for key in ("popularTrackGuitar", "defaultTrack", "popularTrack")],
        *all_indices,
    ]
    picked = _find_track(tracks, candidates, _is_nonvocal_six_string)
    if picked is not None:
        return picked
    fallback = _find_track(tracks, candidates, lambda _: True)
    if fallback is not None:
        return fallback
    raise ValueError("No playable pitched track found in this Songsterr song.")


def _songsterr_title(artist: object, title: object, fallback: str) -> str:
    parts = [str(artist or "").strip(), str(title or "").strip()]
    clean = [p for p in parts if p]
    return " — ".join(clean[:2]) if clean else fallback


def _fetch_songsterr_chords(song_id: str, fetcher: Fetcher) -> ImportedTab:
    chords_meta = _fetch_json(f"https://www.songsterr.com/api/chords/{song_id}", fetcher)
    rev = chords_meta.get("chordsRevisionId") or song_id
    cp_id = chords_meta.get("chordpro")
    if (
        not isinstance(cp_id, str)
        or not cp_id
        or not _SAFE_SEGMENT_RE.fullmatch(cp_id)
        or not str(rev).isdigit()
    ):
        raise ValueError("Songsterr has no chord sheet for this song.")
    cp_url = f"https://chordpro2.songsterr.com/{song_id}/{rev}/{cp_id}.chordpro"
    chordpro = fetcher(cp_url).decode("utf-8", errors="replace")
    strings = extract_tuning_from_text(chordpro)
    title = _songsterr_title(
        chords_meta.get("artist"), chords_meta.get("title"), "Songsterr Chords"
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


def _track_chords_fallback(
    track: dict[str, Any],
    title: str,
    track_index: int | None = None,
    tracks: tuple[ImportedTrack, ...] = (),
) -> ImportedTab:
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
        track_index=track_index,
        tracks=tracks,
    )


def _try_songsterr_chords(song_id: str, fetcher: Fetcher) -> ImportedTab | None:
    try:
        return _fetch_songsterr_chords(song_id, fetcher)
    except ValueError:
        return None


def _track_title(base_title: str, tracks: tuple[ImportedTrack, ...], track_idx: int) -> str:
    if len(tracks) <= 1:
        return base_title
    chosen = next((t for t in tracks if t.index == track_idx), None)
    if chosen is None or chosen.name.lower() in base_title.lower():
        return base_title
    return f"{base_title} — {chosen.name}"


def _validate_cloudfront_parts(sid: object, rev: object, image: object) -> tuple[str, str, str]:
    sid_s, rev_s, img_s = str(sid), str(rev), str(image)
    if (
        not sid_s.isdigit()
        or not rev_s.isdigit()
        or not image
        or not _SAFE_SEGMENT_RE.fullmatch(img_s)
    ):
        raise ValueError("Songsterr revision metadata is malformed.")
    return sid_s, rev_s, img_s


def _import_songsterr_meta(
    song_id: str, track_arg: int | None, wants_chords: bool, fetcher: Fetcher, url: str = ""
) -> ImportedTab:
    meta = _fetch_json(f"https://www.songsterr.com/api/meta/{song_id}", fetcher)
    base_title = _songsterr_title(meta.get("artist"), meta.get("title"), "Songsterr Tab")
    available_tracks = _songsterr_tracks(meta)
    track_idx = _pick_songsterr_track(meta, track_arg, url=url)
    sid, rev, image = _validate_cloudfront_parts(
        meta.get("songId", song_id), meta.get("revisionId"), meta.get("image")
    )
    track = _fetch_json(
        f"https://dqsljvtekg760.cloudfront.net/{sid}/{rev}/{image}/{track_idx}.json", fetcher
    )
    full_title = _track_title(base_title, available_tracks, track_idx)
    if wants_chords:
        return _track_chords_fallback(
            track, full_title, track_index=track_idx, tracks=available_tracks
        )
    return render_songsterr_track(
        track, title=full_title, track_index=track_idx, tracks=available_tracks
    )


def import_songsterr_url(
    url: str,
    fetcher: Fetcher,
    preferred_kind: str = "auto",
    track: int | None = None,
) -> ImportedTab:
    """Import a Songsterr tab or chords URL into a 6-line `ImportedTab`."""
    match = _SONGSTERR_ID_RE.search(url)
    if match is None:
        raise ValueError("Could not find a Songsterr song ID in that URL.")
    song_id, raw_track = match.group(1), match.group(2)
    track_arg = track if track is not None else (int(raw_track) if raw_track is not None else None)
    wants_chords = track is None and (
        preferred_kind == "chords" or (preferred_kind == "auto" and "-chords-" in url.lower())
    )
    if wants_chords and (chords := _try_songsterr_chords(song_id, fetcher)) is not None:
        return chords
    return _import_songsterr_meta(song_id, track_arg, wants_chords, fetcher, url=url)
