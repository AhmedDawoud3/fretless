"""Parse and import Ultimate Guitar HTML pages (`js-store` tab and chord data)."""

import html
import json
from collections.abc import Callable
from typing import Any

from fretless.guitar import GUITAR_TUNINGS
from fretless.tab.chords import clean_ug_markup, expand_chord_sheet, has_six_line_tab
from fretless.tab.import_model import ImportedTab
from fretless.tab.tuning_parse import extract_tempo_from_text, parse_tuning_spec

Fetcher = Callable[[str], bytes]
_STANDARD_STRINGS = GUITAR_TUNINGS["standard"].strings
_STORE_MARKER = 'class="js-store"'


def _extract_attr(snippet: str, attr: str) -> str | None:
    token = f"{attr}="
    at = snippet.find(token)
    if at == -1:
        return None
    after = snippet[at + len(token) :]
    if not after or after[0] not in ('"', "'"):
        return None
    quote = after[0]
    end = after.find(quote, 1)
    return after[1:end] if end != -1 else None


def _ug_store_data(html_text: str) -> dict[str, Any]:
    marker = html_text.find(_STORE_MARKER)
    if marker == -1:
        marker = html_text.find("class='js-store'")
    if marker == -1:
        raise ValueError(
            "Could not find tab data on that Ultimate Guitar page. Paste the tab text instead."
        )
    raw_content = _extract_attr(html_text[marker : marker + 400_000], "data-content")
    if raw_content is None:
        raise ValueError(
            "Could not find tab data on that Ultimate Guitar page. Paste the tab text instead."
        )
    try:
        store = json.loads(html.unescape(raw_content))
    except json.JSONDecodeError as err:
        raise ValueError("Could not decode Ultimate Guitar tab metadata.") from err
    data = store.get("store", {}).get("page", {}).get("data", {})
    if not isinstance(data, dict) or "tab_view" not in data:
        raise ValueError("Ultimate Guitar page did not contain tab content.")
    return data


def _as_dict(value: object) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _clamp_capo(raw: object) -> int:
    if isinstance(raw, int) and not isinstance(raw, bool):
        return max(0, min(12, raw))
    return 0


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
    tuning_val = _as_dict(meta.get("tuning")).get("value")
    strings = strings_override or (
        parse_tuning_spec(tuning_val) if isinstance(tuning_val, str) and tuning_val else None
    )
    parts = [
        str(tab_info.get("artist_name", "")).strip(),
        str(tab_info.get("song_name", "")).strip(),
    ]
    clean_parts = [p for p in parts if p]
    title = " — ".join(clean_parts[:2]) if clean_parts else "Ultimate Guitar Tab"
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


def import_ug_url(
    url: str,
    fetcher: Fetcher,
    preferred_kind: str = "auto",
) -> ImportedTab:
    """Fetch an Ultimate Guitar tab or chords page and parse it into an `ImportedTab`."""
    html_text = fetcher(url).decode("utf-8", errors="replace")
    return parse_ug_html(html_text, preferred_kind=preferred_kind)
