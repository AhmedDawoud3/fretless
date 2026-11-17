"""Tab conversion and import routes (text, chords, Ultimate Guitar, Songsterr, PDF)."""

import base64
import binascii

from fastapi import APIRouter, HTTPException

from fretless.api.lookup import find
from fretless.api.tab_mappers import convert_out, convert_placed_out
from fretless.api.tab_schemas import (
    ConvertIn,
    ConvertOut,
    ImportedTrackOut,
    ImportPdfIn,
    ImportTabOut,
    ImportUrlIn,
    TransposeIn,
)
from fretless.tab.chords import clean_ug_markup, expand_chord_sheet
from fretless.tab.convert import (
    PlacedInputColumn,
    PlacedInputSystem,
    convert,
    transpose_placed_systems,
)
from fretless.tab.convert_model import PlacedNote
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
        tempo=imported.tempo,
        track_index=imported.track_index,
        tracks=[
            ImportedTrackOut(
                index=t.index, name=t.name, instrument=t.instrument, is_vocal=t.is_vocal
            )
            for t in imported.tracks
        ],
    )


@router.post("/api/tab/convert")
def convert_tab(body: ConvertIn) -> ConvertOut:
    tuning = find(TUNINGS, body.oud_tuning, "tuning")
    strings = tuple(body.guitar.strings)
    cleaned = clean_ug_markup(body.text)
    document = parse_tab(cleaned)
    if not any(isinstance(b, TabSystem) for b in document.blocks):
        document = parse_tab(expand_chord_sheet(cleaned, strings, body.guitar.capo))
    steps = (body.transpose_semitones or 0) * 2
    converted = convert(document, strings, body.guitar.capo, tuning, transpose_steps=steps)
    return convert_out(document, converted, tuning, body.mode, strings, body.guitar.capo)


def _to_input_systems(body: TransposeIn) -> list[PlacedInputSystem]:
    out: list[PlacedInputSystem] = []
    for sys in body.systems:
        cols = tuple(
            PlacedInputColumn(
                c.index, tuple(PlacedNote(n.course, n.position, n.pitch) for n in c.notes)
            )
            for c in sys.columns
        )
        techs = tuple(
            (int(k.split(":")[0]), int(k.split(":")[1]), sym)
            for k, sym in sys.techniques.items()
            if ":" in k
        )
        out.append(PlacedInputSystem(sys.index, sys.width, tuple(sys.bars), cols, techs))
    return out


@router.post("/api/tab/transpose")
def transpose_tab(body: TransposeIn) -> ConvertOut:
    tuning = find(TUNINGS, body.oud_tuning, "tuning")
    domain_systems = _to_input_systems(body)
    converted = transpose_placed_systems(domain_systems, tuning, body.transpose_semitones * 2)
    notes_in = sum(len(c.notes) for s in domain_systems for c in s.columns)
    return convert_placed_out(notes_in, converted, tuning, body.mode, tempo=body.tempo)


@router.post("/api/tab/import-url")
def import_url_tab(body: ImportUrlIn) -> ImportTabOut:
    try:
        imported = import_tab_url(body.url, kind=body.kind, track=body.track)
    except ValueError as err:
        raise HTTPException(status_code=422, detail=str(err)) from err
    return _import_out(imported)


@router.post("/api/tab/import-pdf")
def import_pdf_tab(body: ImportPdfIn) -> ImportTabOut:
    try:
        raw = base64.b64decode(body.pdf_base64, validate=True)
        imported = import_pdf_bytes(
            raw, filename=body.filename, preferred_kind=body.kind, track=body.track
        )
    except (binascii.Error, ValueError) as err:
        raise HTTPException(status_code=422, detail=str(err)) from err
    return _import_out(imported)
