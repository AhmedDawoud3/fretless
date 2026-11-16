"""Safe HTTP transport and URL dispatcher for Ultimate Guitar and Songsterr imports."""

import gzip
import io
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Callable
from http.client import HTTPMessage
from typing import IO

from fretless.tab.import_model import ImportedTab
from fretless.tab.songsterr_import import import_songsterr_url, render_songsterr_track
from fretless.tab.ug_import import import_ug_url, parse_ug_html

Fetcher = Callable[[str], bytes]
_TIMEOUT_SECONDS = 12.0
_MAX_FETCH_BYTES = 10 * 1024 * 1024  # 10 MB cap per response / decompressed payload
_ALLOWED_DOMAINS = ("ultimate-guitar.com", "songsterr.com", "cloudfront.net")
_HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}


def _is_allowed_url(url: str) -> bool:
    parsed = urllib.parse.urlsplit(url)
    host = (parsed.hostname or "").lower()
    if parsed.scheme not in ("http", "https") or not host:
        return False
    return any(host == domain or host.endswith(f".{domain}") for domain in _ALLOWED_DOMAINS)


class _SafeRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(
        self,
        req: urllib.request.Request,
        fp: IO[bytes],
        code: int,
        msg: str,
        headers: HTTPMessage,
        newurl: str,
    ) -> urllib.request.Request | None:
        target = urllib.parse.urljoin(req.full_url, newurl)
        if not _is_allowed_url(target):
            raise urllib.error.URLError("Blocked redirect to untrusted host.")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


_OPENER = urllib.request.build_opener(_SafeRedirectHandler)


def default_fetch(url: str) -> bytes:
    """Fetch a bounded allowlisted URL; raises ValueError on HTTP, redirect, or size errors."""
    req = urllib.request.Request(url, headers=_HEADERS)
    try:
        with _OPENER.open(req, timeout=_TIMEOUT_SECONDS) as resp:
            raw = resp.read(_MAX_FETCH_BYTES + 1)
    except urllib.error.HTTPError as err:
        raise ValueError(
            f"Remote server returned HTTP {err.code}. If blocked, paste the tab or export PDF."
        ) from err
    except (urllib.error.URLError, TimeoutError, OSError) as err:
        raise ValueError(f"Could not reach remote host: {err}") from err
    if len(raw) > _MAX_FETCH_BYTES:
        raise ValueError("Remote response exceeded size limit.")
    return raw


def _maybe_gunzip(raw: bytes) -> bytes:
    if not raw.startswith(b"\x1f\x8b"):
        return raw
    with gzip.GzipFile(fileobj=io.BytesIO(raw)) as stream:
        decompressed = stream.read(_MAX_FETCH_BYTES + 1)
    if len(decompressed) > _MAX_FETCH_BYTES:
        raise ValueError("Decompressed response exceeded size limit.")
    return decompressed


def _safe_fetcher(fetcher: Fetcher) -> Fetcher:
    return lambda u: _maybe_gunzip(fetcher(u))


def import_tab_url(
    url: str,
    kind: str = "auto",
    fetcher: Fetcher = default_fetch,
    track: int | None = None,
) -> ImportedTab:
    """Import an Ultimate Guitar or Songsterr tab/chords URL into a 6-line `ImportedTab`."""
    cleaned = url.strip()
    parsed = urllib.parse.urlsplit(cleaned)
    host = (parsed.hostname or "").lower()
    if parsed.scheme not in ("http", "https") or not host:
        raise ValueError("Enter a valid http(s) Ultimate Guitar or Songsterr URL.")
    decoded_fetcher = _safe_fetcher(fetcher)
    if host == "ultimate-guitar.com" or host.endswith(".ultimate-guitar.com"):
        return import_ug_url(cleaned, decoded_fetcher, preferred_kind=kind)
    if host == "songsterr.com" or host.endswith(".songsterr.com"):
        return import_songsterr_url(cleaned, decoded_fetcher, preferred_kind=kind, track=track)
    raise ValueError("Enter a valid Ultimate Guitar or Songsterr URL.")


__all__ = [
    "Fetcher",
    "default_fetch",
    "import_songsterr_url",
    "import_tab_url",
    "import_ug_url",
    "parse_ug_html",
    "render_songsterr_track",
]
