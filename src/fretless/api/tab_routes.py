"""Tab conversion and import routes (text, chords, Ultimate Guitar, Songsterr, PDF)."""

import base64
import binascii

from fastapi import APIRouter, HTTPException

from fretless.api.lookup import find
from fretless.api.tab_mappers import convert_out
from fretless.api.tab_schemas import ConvertIn, ConvertOut, ImportPdfIn, ImportTabOut, ImportUrlIn
from fretless.tab.chords import clean_ug_markup, expand_chord_sheet
from fretless.tab.convert import convert
from fretless.tab.import_model import ImportedTab
from fretless.tab.model import TabSystem
from fretless.tab.parse import parse_tab
from fretless.tab.pdf_import import import_pdf_bytes
from fretless.tab.url_import import import_tab_url
from fretless.tuning import TUNINGS

router = APIRouter()


def _import_out(imported: ImportedTab) -> ImportTabOut:
    return ImportTabOut(
        title=imported.title,
        source=imported.source,
        kind=imported.kind,
        text=imported.text,
        strings=list(imported.strings) if imported.strings is not None else None,
        capo=imported.capo,
    )


@router.post("/api/tab/convert")
def convert_tab(body: ConvertIn) -> ConvertOut:
    tuning = find(TUNINGS, body.oud_tuning, "tuning")
    strings = tuple(body.guitar.strings)
    cleaned = clean_ug_markup(body.text)
    document = parse_tab(cleaned)
    if not any(isinstance(b, TabSystem) for b in document.blocks):
        document = parse_tab(expand_chord_sheet(cleaned, strings, body.guitar.capo))
    converted = convert(document, strings, body.guitar.capo, tuning)
    return convert_out(document, converted, tuning, body.mode, strings, body.guitar.capo)


@router.post("/api/tab/import-url")
def import_url_tab(body: ImportUrlIn) -> ImportTabOut:
    try:
        imported = import_tab_url(body.url, kind=body.kind)
    except ValueError as err:
        raise HTTPException(status_code=422, detail=str(err)) from err
    return _import_out(imported)


@router.post("/api/tab/import-pdf")
def import_pdf_tab(body: ImportPdfIn) -> ImportTabOut:
    try:
        raw = base64.b64decode(body.pdf_base64, validate=True)
        imported = import_pdf_bytes(raw, filename=body.filename, preferred_kind=body.kind)
    except (binascii.Error, ValueError) as err:
        raise HTTPException(status_code=422, detail=str(err)) from err
    return _import_out(imported)
