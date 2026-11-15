"""Tab conversion route."""

from fastapi import APIRouter

from fretless.api.lookup import find
from fretless.api.tab_mappers import convert_out
from fretless.api.tab_schemas import ConvertIn, ConvertOut
from fretless.tab.convert import convert
from fretless.tab.parse import parse_tab
from fretless.tuning import TUNINGS

router = APIRouter()


@router.post("/api/tab/convert")
def convert_tab(body: ConvertIn) -> ConvertOut:
    tuning = find(TUNINGS, body.oud_tuning, "tuning")
    document = parse_tab(body.text)
    converted = convert(document, tuple(body.guitar.strings), body.guitar.capo, tuning)
    return convert_out(document, converted, tuning, body.mode)
